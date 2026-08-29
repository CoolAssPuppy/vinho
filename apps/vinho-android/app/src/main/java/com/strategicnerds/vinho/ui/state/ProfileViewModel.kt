package com.strategicnerds.vinho.ui.state

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.data.model.UserProfile
import com.strategicnerds.vinho.data.model.PriceRange
import com.strategicnerds.vinho.data.model.WinePreferences
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
    val selectedWineTypes: Set<String> = emptySet(),
    val selectedRegions: Set<String> = emptySet(),
    val selectedVarietals: Set<String> = emptySet(),
    val selectedStyles: Set<String> = emptySet(),
    val minimumPrice: Int = 20,
    val maximumPrice: Int = 100,
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
                        tastingNoteStyle = it.tastingNoteStyle ?: "casual",
                        selectedWineTypes = it.winePreferences?.wineTypes.orEmpty().toSet(),
                        selectedRegions = it.favoriteRegions.orEmpty().toSet(),
                        selectedVarietals = it.favoriteVarietals.orEmpty().toSet(),
                        selectedStyles = it.favoriteStyles.orEmpty().toSet(),
                        minimumPrice = it.priceRange?.low ?: 20,
                        maximumPrice = it.priceRange?.high ?: 100
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

    fun toggleWineType(value: String) = updateSelection(value, ProfileSelection.WINE_TYPE)

    fun toggleRegion(value: String) = updateSelection(value, ProfileSelection.REGION)

    fun toggleVarietal(value: String) = updateSelection(value, ProfileSelection.VARIETAL)

    fun toggleStyle(value: String) = updateSelection(value, ProfileSelection.STYLE)

    fun addRegion(value: String) {
        val region = value.trim()
        if (region.isNotEmpty()) {
            _uiState.value = _uiState.value.copy(
                selectedRegions = _uiState.value.selectedRegions + region
            )
        }
    }

    fun setPriceRange(minimum: Int, maximum: Int) {
        _uiState.value = _uiState.value.copy(
            minimumPrice = minimum.coerceAtMost(maximum - 10),
            maximumPrice = maximum.coerceAtLeast(minimum + 10)
        )
    }

    fun uploadAvatar(imageBytes: ByteArray, userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            runCatching {
                // Bucket is "avatars" (exists in prod: avatars/scans/wine-images/
                // wine-labels). The storage RLS policy scopes on the first path
                // segment == auth.uid(), so the object path must be "<userId>/...".
                val fileName = "$userId/${UUID.randomUUID()}.jpg"
                client.storage["avatars"].upload(fileName, imageBytes) { upsert = true }
                val publicUrl = client.storage["avatars"].publicUrl(fileName)
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
                winePreferences = WinePreferences(
                    wineTypes = state.selectedWineTypes.sorted(),
                    priceRange = listOf(state.minimumPrice, state.maximumPrice),
                    collectBottles = state.profile?.winePreferences?.collectBottles,
                    tastingNoteStyle = state.tastingNoteStyle
                ),
                favoriteRegions = state.selectedRegions.sorted(),
                favoriteVarietals = state.selectedVarietals.sorted(),
                favoriteStyles = state.selectedStyles.sorted(),
                priceRange = PriceRange(state.minimumPrice, state.maximumPrice)
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

    private fun updateSelection(value: String, selection: ProfileSelection) {
        val state = _uiState.value
        fun Set<String>.toggled(): Set<String> =
            if (contains(value)) minus(value) else plus(value)

        _uiState.value = when (selection) {
            ProfileSelection.WINE_TYPE -> state.copy(selectedWineTypes = state.selectedWineTypes.toggled())
            ProfileSelection.REGION -> state.copy(selectedRegions = state.selectedRegions.toggled())
            ProfileSelection.VARIETAL -> state.copy(selectedVarietals = state.selectedVarietals.toggled())
            ProfileSelection.STYLE -> state.copy(selectedStyles = state.selectedStyles.toggled())
        }
    }
}

private enum class ProfileSelection {
    WINE_TYPE,
    REGION,
    VARIETAL,
    STYLE
}
