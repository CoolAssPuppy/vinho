package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.data.model.ExpertRating
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.repository.WineRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TastingDetailState(
    val expertRating: ExpertRating? = null,
    val isLoadingExpertRating: Boolean = false,
    val hasAttemptedFetch: Boolean = false
)

@HiltViewModel
class TastingDetailViewModel @Inject constructor(
    private val wineRepository: WineRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TastingDetailState())
    val state: StateFlow<TastingDetailState> = _state.asStateFlow()

    fun fetchExpertRating(tasting: Tasting) {
        if (_state.value.hasAttemptedFetch) return

        val vintage = tasting.vintage ?: return
        val wine = vintage.wine ?: return

        viewModelScope.launch {
            _state.value = _state.value.copy(
                isLoadingExpertRating = true,
                hasAttemptedFetch = true
            )

            val expertRating = wineRepository.fetchExpertRating(
                vintageId = vintage.id,
                wineName = wine.name,
                producerName = wine.producer?.name,
                year = vintage.year
            )

            _state.value = _state.value.copy(
                expertRating = expertRating,
                isLoadingExpertRating = false
            )
        }
    }

    fun refreshExpertRating(tasting: Tasting) {
        val vintage = tasting.vintage ?: return
        val wine = vintage.wine ?: return

        viewModelScope.launch {
            _state.value = _state.value.copy(isLoadingExpertRating = true)

            val expertRating = wineRepository.fetchExpertRating(
                vintageId = vintage.id,
                wineName = wine.name,
                producerName = wine.producer?.name,
                year = vintage.year
            )

            _state.value = _state.value.copy(
                expertRating = expertRating,
                isLoadingExpertRating = false
            )
        }
    }

    fun reset() {
        _state.value = TastingDetailState()
    }
}
