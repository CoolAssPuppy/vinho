package com.strategicnerds.vinho.ui.state

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.core.preferences.UserPreferences
import com.strategicnerds.vinho.core.preferences.VinhoPreferences
import com.strategicnerds.vinho.core.security.BiometricLockController
import com.strategicnerds.vinho.data.model.UserProfile
import com.strategicnerds.vinho.data.repository.AuthRepository
import com.strategicnerds.vinho.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class SessionUiState(
    val isLoading: Boolean = true,
    val isAuthenticated: Boolean = false,
    val userProfile: UserProfile? = null,
    val error: String? = null,
    val preferences: VinhoPreferences = VinhoPreferences()
)

@HiltViewModel
class SessionViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val profileRepository: ProfileRepository,
    private val analytics: AnalyticsService,
    private val preferences: UserPreferences,
    private val biometricLockController: BiometricLockController
) : ViewModel() {

    private val _uiState = MutableStateFlow(SessionUiState())
    val uiState: StateFlow<SessionUiState> = _uiState.asStateFlow()

    init {
        observePreferences()
        refreshSession()
    }

    private fun observePreferences() {
        viewModelScope.launch {
            preferences.flow.collect { prefs ->
                _uiState.value = _uiState.value.copy(preferences = prefs)
            }
        }
    }

    fun refreshSession() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val session = authRepository.currentSession()
            if (session != null) {
                val profileId = session.user?.id ?: return@launch
                val profile = profileRepository.fetchProfile(profileId)
                analytics.identify(
                    userId = profileId.toString(),
                    properties = mapOf("email" to session.user?.email.orEmpty())
                )
                analytics.track("app.opened")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    userProfile = profile
                )
                if (_uiState.value.preferences.biometricsEnabled) {
                    biometricLockController.lock()
                }
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = false,
                    userProfile = null
                )
            }
        }
    }

    fun handleDeepLink(uri: Uri) {
        viewModelScope.launch {
            runCatching { authRepository.handleDeepLink(uri) }
                .onSuccess { session ->
                    session?.user?.id?.let {
                        analytics.track("auth.oauth_completed", mapOf("provider" to uri.host.orEmpty()))
                    }
                    refreshSession()
                }
                .onFailure { throwable ->
                    _uiState.value = _uiState.value.copy(error = throwable.message)
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching {
                authRepository.signOut()
                analytics.reset()
                analytics.track("auth.signed_out")
            }.onSuccess {
                _uiState.value = SessionUiState(isLoading = false, isAuthenticated = false)
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(error = throwable.message)
            }
        }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            val accessToken = authRepository.currentSession()?.accessToken ?: return@launch
            val success = authRepository.deleteAccount(accessToken)
            if (success) {
                analytics.track("account.deleted")
                signOut()
            } else {
                _uiState.value = _uiState.value.copy(error = "Unable to delete your account right now")
            }
        }
    }

    fun updateProfileLocally(profile: UserProfile) {
        _uiState.value = _uiState.value.copy(userProfile = profile)
    }

    fun markOnboardingComplete() {
        viewModelScope.launch { preferences.setOnboardingComplete() }
    }

    fun toggleBiometrics(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setBiometricsEnabled(enabled)
            if (enabled) {
                biometricLockController.lock()
                analytics.track("biometrics.enabled")
            } else {
                biometricLockController.unlock()
                analytics.track("biometrics.disabled")
            }
        }
    }
}
