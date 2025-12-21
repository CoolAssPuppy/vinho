package com.vinho.android.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vinho.android.core.analytics.AnalyticsService
import com.vinho.android.data.model.Scan
import com.vinho.android.data.model.Tasting
import com.vinho.android.data.model.Wine
import com.vinho.android.data.model.WineStats
import com.vinho.android.data.repository.ScanRepository
import com.vinho.android.data.repository.TastingRepository
import com.vinho.android.data.repository.WineRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val tastings: List<Tasting> = emptyList(),
    val wines: List<Wine> = emptyList(),
    val scans: List<Scan> = emptyList(),
    val stats: WineStats? = null,
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val tastingRepository: TastingRepository,
    private val wineRepository: WineRepository,
    private val scanRepository: ScanRepository,
    private val analytics: AnalyticsService
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun load(userId: UUID?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            runCatching {
                val tastings = tastingRepository.fetchPagedTastings(0)
                val wines = wineRepository.fetchWines()
                val scans = scanRepository.fetchScans()
                val stats = tastingRepository.fetchStats()
                analytics.track("home.loaded")
                HomeUiState(
                    isLoading = false,
                    tastings = tastings,
                    wines = wines,
                    scans = scans,
                    stats = stats
                )
            }.onSuccess { state ->
                _uiState.value = state
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(isLoading = false, error = throwable.message)
            }
        }
    }

    fun refreshStats() {
        viewModelScope.launch {
            val stats = tastingRepository.fetchStats()
            _uiState.value = _uiState.value.copy(stats = stats)
        }
    }

    fun search(query: String, userId: UUID) {
        viewModelScope.launch {
            if (query.isBlank()) {
                load(userId)
                return@launch
            }
            _uiState.value = _uiState.value.copy(isLoading = true)
            runCatching {
                tastingRepository.searchTastings(query, userId)
            }.onSuccess { tastings ->
                analytics.track("search.tastings", mapOf("query" to query))
                _uiState.value = _uiState.value.copy(isLoading = false, tastings = tastings)
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(isLoading = false, error = throwable.message)
            }
        }
    }

    fun onTastingSaved() {
        viewModelScope.launch {
            analytics.track("tasting.saved")
            refreshStats()
        }
    }

    fun track(event: String) = analytics.track(event)
}
