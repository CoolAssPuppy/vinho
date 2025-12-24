package com.strategicnerds.vinho.ui.state

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.model.Vintage
import com.strategicnerds.vinho.data.repository.TastingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID
import javax.inject.Inject

private const val TAG = "TastingEditorViewModel"

enum class TastingStyle {
    CASUAL,
    SOMMELIER,
    WINEMAKER
}

data class TastingEditorState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val tastingStyle: TastingStyle = TastingStyle.CASUAL,
    val existingTasting: Tasting? = null,
    val vintage: Vintage? = null,
    val verdict: Int = 3,
    val notes: String = "",
    val detailedNotes: String = "",
    val tastedAt: LocalDate = LocalDate.now(),
    val locationName: String = "",
    val locationAddress: String = "",
    val locationCity: String = "",
    val locationLatitude: Double? = null,
    val locationLongitude: Double? = null,
    val error: String? = null,
    val saveSuccess: Boolean = false
)

@HiltViewModel
class TastingEditorViewModel @Inject constructor(
    private val tastingRepository: TastingRepository,
    private val analytics: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow(TastingEditorState())
    val uiState: StateFlow<TastingEditorState> = _uiState.asStateFlow()

    fun loadExistingTasting(tasting: Tasting) {
        val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE
        val tastedDate = tasting.tastedAt?.let {
            runCatching { LocalDate.parse(it.take(10), dateFormatter) }.getOrNull()
        } ?: LocalDate.now()

        _uiState.value = TastingEditorState(
            existingTasting = tasting,
            vintage = tasting.vintage,
            verdict = tasting.verdict ?: 3,
            notes = tasting.notes ?: "",
            detailedNotes = tasting.detailedNotes ?: "",
            tastedAt = tastedDate,
            locationName = tasting.locationName ?: "",
            locationAddress = tasting.locationAddress ?: "",
            locationCity = tasting.locationCity ?: "",
            locationLatitude = tasting.locationLatitude,
            locationLongitude = tasting.locationLongitude
        )
    }

    fun loadVintage(vintage: Vintage) {
        _uiState.value = _uiState.value.copy(vintage = vintage)
    }

    fun setTastingStyle(style: TastingStyle) {
        _uiState.value = _uiState.value.copy(tastingStyle = style)
        analytics.track("tasting.style_changed", mapOf("style" to style.name))
    }

    fun setVerdict(verdict: Int) {
        _uiState.value = _uiState.value.copy(verdict = verdict.coerceIn(1, 5))
    }

    fun setNotes(notes: String) {
        _uiState.value = _uiState.value.copy(notes = notes)
    }

    fun setDetailedNotes(detailedNotes: String) {
        _uiState.value = _uiState.value.copy(detailedNotes = detailedNotes)
    }

    fun setTastedAt(date: LocalDate) {
        _uiState.value = _uiState.value.copy(tastedAt = date)
    }

    fun setLocation(
        name: String,
        address: String = "",
        city: String = "",
        latitude: Double? = null,
        longitude: Double? = null
    ) {
        _uiState.value = _uiState.value.copy(
            locationName = name,
            locationAddress = address,
            locationCity = city,
            locationLatitude = latitude,
            locationLongitude = longitude
        )
    }

    fun saveTasting(userId: String) {
        val state = _uiState.value
        val vintageId = state.vintage?.id ?: state.existingTasting?.vintageId
        if (vintageId == null) {
            _uiState.value = state.copy(error = "No wine selected")
            return
        }

        viewModelScope.launch {
            _uiState.value = state.copy(isSaving = true, error = null)

            val tasting = Tasting(
                id = state.existingTasting?.id ?: UUID.randomUUID().toString(),
                userId = userId,
                vintageId = vintageId,
                verdict = state.verdict,
                notes = state.notes.takeIf { it.isNotBlank() },
                detailedNotes = state.detailedNotes.takeIf { it.isNotBlank() },
                tastedAt = state.tastedAt.format(DateTimeFormatter.ISO_LOCAL_DATE),
                locationName = state.locationName.takeIf { it.isNotBlank() },
                locationAddress = state.locationAddress.takeIf { it.isNotBlank() },
                locationCity = state.locationCity.takeIf { it.isNotBlank() },
                locationLatitude = state.locationLatitude,
                locationLongitude = state.locationLongitude,
                vintage = state.vintage
            )

            runCatching {
                tastingRepository.upsertTasting(tasting)
            }.onSuccess {
                analytics.track("tasting.saved", mapOf(
                    "style" to state.tastingStyle.name,
                    "verdict" to state.verdict.toString(),
                    "has_notes" to state.notes.isNotBlank().toString(),
                    "has_detailed_notes" to state.detailedNotes.isNotBlank().toString(),
                    "has_location" to state.locationName.isNotBlank().toString()
                ))
                _uiState.value = state.copy(isSaving = false, saveSuccess = true)
            }.onFailure { throwable ->
                Log.e(TAG, "Failed to save tasting", throwable)
                _uiState.value = state.copy(
                    isSaving = false,
                    error = "Unable to save tasting. Please try again."
                )
            }
        }
    }

    fun deleteTasting(tastingId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            runCatching {
                tastingRepository.deleteTasting(tastingId)
            }.onSuccess {
                analytics.track("tasting.deleted")
                _uiState.value = _uiState.value.copy(isLoading = false, saveSuccess = true)
            }.onFailure { throwable ->
                Log.e(TAG, "Failed to delete tasting", throwable)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Unable to delete tasting. Please try again."
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun resetState() {
        _uiState.value = TastingEditorState()
    }
}
