package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.data.repository.DataExportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DataExportState(
    val isExporting: Boolean = false,
    val json: String? = null,
    val error: String? = null
)

@HiltViewModel
class DataExportViewModel @Inject constructor(
    private val repository: DataExportRepository
) : ViewModel() {
    private val _state = MutableStateFlow(DataExportState())
    val state: StateFlow<DataExportState> = _state.asStateFlow()

    fun export() {
        viewModelScope.launch {
            _state.value = DataExportState(isExporting = true)
            runCatching { repository.exportJson() }
                .onSuccess { _state.value = DataExportState(json = it) }
                .onFailure { _state.value = DataExportState(error = "Unable to export your data.") }
        }
    }

    fun consumeExport() {
        _state.value = DataExportState()
    }
}
