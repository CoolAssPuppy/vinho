package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.providers.OAuthProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val didAuthenticate: Boolean = false,
    val resetPasswordSent: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val analytics: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching {
                val session = authRepository.signIn(email, password)
                analytics.identify(session?.user?.id?.toString().orEmpty())
                analytics.track("auth.sign_in", mapOf("provider" to "email"))
            }.onSuccess {
                _uiState.value = AuthUiState(didAuthenticate = true)
            }.onFailure { throwable ->
                _uiState.value = AuthUiState(error = throwable.message)
            }
        }
    }

    fun signUp(email: String, password: String, fullName: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching {
                val session = authRepository.signUp(email, password, fullName)
                analytics.identify(session?.user?.id?.toString().orEmpty(), mapOf("email" to email))
                analytics.track("auth.sign_up", mapOf("provider" to "email"))
            }.onSuccess {
                _uiState.value = AuthUiState(didAuthenticate = true)
            }.onFailure { throwable ->
                _uiState.value = AuthUiState(error = throwable.message)
            }
        }
    }

    fun signInWith(provider: OAuthProvider) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching { authRepository.signInWithOAuth(provider) }
                .onSuccess {
                    analytics.track("auth.oauth_started", mapOf("provider" to provider::class.simpleName.orEmpty()))
                    _uiState.value = _uiState.value.copy(isLoading = false)
                }
                .onFailure { throwable ->
                    _uiState.value = AuthUiState(error = throwable.message)
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun resetPassword(email: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            runCatching {
                authRepository.resetPassword(email)
                analytics.track("auth.reset_password_requested", mapOf("email" to email))
            }.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, resetPasswordSent = true)
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(isLoading = false, error = throwable.message)
            }
        }
    }

    fun clearResetPasswordSent() {
        _uiState.value = _uiState.value.copy(resetPasswordSent = false)
    }
}
