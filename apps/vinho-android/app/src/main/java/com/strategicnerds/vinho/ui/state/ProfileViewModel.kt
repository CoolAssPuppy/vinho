package com.strategicnerds.vinho.ui.state

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.data.model.UserProfile
import com.strategicnerds.vinho.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ProfileEditState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val profile: UserProfile? = null,
    val firstName: String = "",
    val lastName: String = "",
    val description: String = "",
    val avatarUrl: String? = null,
    val tastingNoteStyle: String = "casual",
    val error: String? = null,
    val saveSuccess: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val client: SupabaseClient,
    private val analytics: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileEditState())
    val uiState: StateFlow<ProfileEditState> = _uiState.asStateFlow()

    fun loadProfile(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            runCatching {
                profileRepository.fetchProfile(userId)
            }.onSuccess { profile ->
                profile?.let {
                    _uiState.value = ProfileEditState(
                        isLoading = false,
                        profile = it,
                        firstName = it.firstName ?: "",
                        lastName = it.lastName ?: "",
                        description = it.description ?: "",
                        avatarUrl = it.avatarUrl,
                        tastingNoteStyle = it.tastingNoteStyle ?: "casual"
                    )
                }
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(isLoading = false, error = throwable.message)
            }
        }
    }

    fun setFirstName(firstName: String) {
        _uiState.value = _uiState.value.copy(firstName = firstName)
    }

    fun setLastName(lastName: String) {
        _uiState.value = _uiState.value.copy(lastName = lastName)
    }

    fun setDescription(description: String) {
        _uiState.value = _uiState.value.copy(description = description)
    }

    fun setTastingNoteStyle(style: String) {
        _uiState.value = _uiState.value.copy(tastingNoteStyle = style)
    }

    fun uploadAvatar(imageBytes: ByteArray, userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            runCatching {
                val fileName = "avatars/$userId/${UUID.randomUUID()}.jpg"
                client.storage["profile-images"].upload(fileName, imageBytes) { upsert = true }
                val publicUrl = client.storage["profile-images"].publicUrl(fileName)
                profileRepository.updateAvatar(userId, publicUrl)
                publicUrl
            }.onSuccess { url ->
                analytics.track("profile.avatar_uploaded")
                _uiState.value = _uiState.value.copy(isSaving = false, avatarUrl = url)
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(isSaving = false, error = throwable.message)
            }
        }
    }

    fun saveProfile(userId: String) {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.value = state.copy(isSaving = true, error = null)

            val updatedProfile = UserProfile(
                id = userId,
                email = state.profile?.email,
                firstName = state.firstName.takeIf { it.isNotBlank() },
                lastName = state.lastName.takeIf { it.isNotBlank() },
                description = state.description.takeIf { it.isNotBlank() },
                avatarUrl = state.avatarUrl,
                tastingNoteStyle = state.tastingNoteStyle,
                winePreferences = state.profile?.winePreferences,
                favoriteRegions = state.profile?.favoriteRegions,
                favoriteVarietals = state.profile?.favoriteVarietals,
                favoriteStyles = state.profile?.favoriteStyles,
                priceRange = state.profile?.priceRange
            )

            runCatching {
                profileRepository.upsertProfile(updatedProfile)
            }.onSuccess {
                analytics.track("profile.saved")
                _uiState.value = state.copy(isSaving = false, saveSuccess = true, profile = updatedProfile)
            }.onFailure { throwable ->
                _uiState.value = state.copy(isSaving = false, error = throwable.message)
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun resetSaveSuccess() {
        _uiState.value = _uiState.value.copy(saveSuccess = false)
    }
}
