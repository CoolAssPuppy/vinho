package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.recommendations.VisualSimilarityService
import com.strategicnerds.vinho.data.model.RecommendationType
import com.strategicnerds.vinho.data.model.SimilarWine
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SuggestionsUiState(
    val wines: List<SimilarWine> = emptyList(),
    val recommendationType: RecommendationType = RecommendationType.YOUR_FAVORITES,
    val isLoading: Boolean = false,
    val hasLoaded: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class SuggestionsViewModel @Inject constructor(
    private val similarityService: VisualSimilarityService
) : ViewModel() {

    private val _uiState = MutableStateFlow(SuggestionsUiState())
    val uiState: StateFlow<SuggestionsUiState> = _uiState.asStateFlow()

    fun fetchSimilarWines() {
        if (_uiState.value.isLoading) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            try {
                val result = similarityService.fetchSimilarWines()
                _uiState.update {
                    it.copy(
                        wines = result.wines,
                        recommendationType = result.recommendationType,
                        hasLoaded = true,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: "Failed to load recommendations",
                        isLoading = false
                    )
                }
            }
        }
    }

    fun refresh() {
        _uiState.update { it.copy(hasLoaded = false) }
        fetchSimilarWines()
    }

    fun loadIfNeeded(hasTastings: Boolean) {
        if (hasTastings && !_uiState.value.hasLoaded && !_uiState.value.isLoading) {
            fetchSimilarWines()
        }
    }
}
