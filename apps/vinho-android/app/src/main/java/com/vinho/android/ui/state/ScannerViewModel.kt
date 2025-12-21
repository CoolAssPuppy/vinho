package com.vinho.android.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vinho.android.data.repository.ScanRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ScannerUiState(
    val isUploading: Boolean = false,
    val successScanId: UUID? = null,
    val error: String? = null
)

@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val scanRepository: ScanRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScannerUiState())
    val uiState: StateFlow<ScannerUiState> = _uiState.asStateFlow()

    fun uploadScan(imageData: ByteArray, userId: UUID) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUploading = true, error = null, successScanId = null)
            runCatching { scanRepository.uploadScan(imageData, userId) }
                .onSuccess { id ->
                    _uiState.value = ScannerUiState(isUploading = false, successScanId = id)
                }
                .onFailure { throwable ->
                    _uiState.value = ScannerUiState(isUploading = false, error = throwable.message)
                }
        }
    }

    fun clearStatus() {
        _uiState.value = ScannerUiState()
    }
}
