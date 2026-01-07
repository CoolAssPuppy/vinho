package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.data.model.ExpertRating
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.model.Wine
import com.strategicnerds.vinho.data.repository.TastingRepository
import com.strategicnerds.vinho.data.repository.WineRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class WineViewMode {
    GRID,
    LIST
}

enum class WineTypeFilter {
    ALL,
    RED,
    WHITE,
    ROSE,
    SPARKLING,
    DESSERT
}

data class WineListState(
    val isLoading: Boolean = false,
    val wines: List<Wine> = emptyList(),
    val filteredWines: List<Wine> = emptyList(),
    val searchQuery: String = "",
    val viewMode: WineViewMode = WineViewMode.GRID,
    val typeFilter: WineTypeFilter = WineTypeFilter.ALL,
    val error: String? = null
)

data class WineDetailState(
    val isLoading: Boolean = false,
    val wine: Wine? = null,
    val tastings: List<Tasting> = emptyList(),
    val expertRating: ExpertRating? = null,
    val isLoadingExpertRating: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class WineListViewModel @Inject constructor(
    private val wineRepository: WineRepository,
    private val tastingRepository: TastingRepository,
    private val analytics: AnalyticsService
) : ViewModel() {

    private val _listState = MutableStateFlow(WineListState())
    val listState: StateFlow<WineListState> = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(WineDetailState())
    val detailState: StateFlow<WineDetailState> = _detailState.asStateFlow()

    fun loadWines() {
        viewModelScope.launch {
            _listState.value = _listState.value.copy(isLoading = true)
            runCatching {
                wineRepository.fetchWines()
            }.onSuccess { wines ->
                analytics.track("wines.loaded", mapOf("count" to wines.size.toString()))
                _listState.value = _listState.value.copy(
                    isLoading = false,
                    wines = wines,
                    filteredWines = applyFilters(wines, _listState.value.searchQuery, _listState.value.typeFilter)
                )
            }.onFailure { throwable ->
                _listState.value = _listState.value.copy(isLoading = false, error = throwable.message)
            }
        }
    }

    fun search(query: String) {
        _listState.value = _listState.value.copy(searchQuery = query)
        applyCurrentFilters()
    }

    fun setViewMode(mode: WineViewMode) {
        _listState.value = _listState.value.copy(viewMode = mode)
        analytics.track("wines.view_mode_changed", mapOf("mode" to mode.name))
    }

    fun setTypeFilter(filter: WineTypeFilter) {
        _listState.value = _listState.value.copy(typeFilter = filter)
        applyCurrentFilters()
        analytics.track("wines.filter_changed", mapOf("type" to filter.name))
    }

    private fun applyCurrentFilters() {
        val state = _listState.value
        val filtered = applyFilters(state.wines, state.searchQuery, state.typeFilter)
        _listState.value = state.copy(filteredWines = filtered)
    }

    private fun applyFilters(wines: List<Wine>, query: String, typeFilter: WineTypeFilter): List<Wine> {
        return wines.filter { wine ->
            val matchesQuery = query.isBlank() ||
                    wine.name.contains(query, ignoreCase = true) ||
                    wine.producer?.name?.contains(query, ignoreCase = true) == true ||
                    wine.producer?.region?.name?.contains(query, ignoreCase = true) == true

            val matchesType = typeFilter == WineTypeFilter.ALL ||
                    wine.name.lowercase().contains(typeFilter.name.lowercase())

            matchesQuery && matchesType
        }
    }

    fun loadWineDetail(wineId: String) {
        viewModelScope.launch {
            _detailState.value = WineDetailState(isLoading = true)
            runCatching {
                val wine = wineRepository.fetchWineById(wineId)
                val tastings = if (wine != null) {
                    tastingRepository.fetchTastingsForWine(wineId)
                } else emptyList()
                Pair(wine, tastings)
            }.onSuccess { (wine, tastings) ->
                analytics.track("wine.detail_viewed", mapOf("wine_id" to wineId))
                _detailState.value = WineDetailState(
                    isLoading = false,
                    wine = wine,
                    tastings = tastings
                )
            }.onFailure { throwable ->
                _detailState.value = WineDetailState(isLoading = false, error = throwable.message)
            }
        }
    }

    fun clearDetailState() {
        _detailState.value = WineDetailState()
    }

    fun fetchExpertRating() {
        val wine = _detailState.value.wine ?: return
        val vintage = wine.vintages?.firstOrNull() ?: return

        viewModelScope.launch {
            _detailState.value = _detailState.value.copy(isLoadingExpertRating = true)

            val expertRating = wineRepository.fetchExpertRating(
                vintageId = vintage.id,
                wineName = wine.name,
                producerName = wine.producer?.name,
                year = vintage.year
            )

            _detailState.value = _detailState.value.copy(
                expertRating = expertRating,
                isLoadingExpertRating = false
            )
        }
    }

    fun refreshExpertRating() {
        fetchExpertRating()
    }
}
