package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.repository.ScanRepository
import com.strategicnerds.vinho.data.repository.TastingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import javax.inject.Inject

enum class ScannerStep {
    CAMERA,
    RESULT
}

enum class ProcessingStatus {
    IDLE,
    UPLOADING,
    PROCESSING,
    COMPLETED,
    FAILED,

    /**
     * Polling gave up before the queue item reached a terminal state. The scan is
     * safely enqueued and will still be processed, so this is distinct from both
     * COMPLETED (which claimed success we had not observed) and FAILED.
     */
    TIMED_OUT
}

data class ScannerUiState(
    val step: ScannerStep = ScannerStep.CAMERA,
    val isUploading: Boolean = false,
    val processingStatus: ProcessingStatus = ProcessingStatus.IDLE,
    val capturedImageBytes: ByteArray? = null,
    val winesAddedQueueId: String? = null,
    val pendingVintageId: String? = null,
    val pendingTasting: Tasting? = null,
    val error: String? = null,
    val flashEnabled: Boolean = false
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as ScannerUiState
        if (step != other.step) return false
        if (isUploading != other.isUploading) return false
        if (processingStatus != other.processingStatus) return false
        if (capturedImageBytes != null) {
            if (other.capturedImageBytes == null) return false
            if (!capturedImageBytes.contentEquals(other.capturedImageBytes)) return false
        } else if (other.capturedImageBytes != null) return false
        if (winesAddedQueueId != other.winesAddedQueueId) return false
        if (pendingVintageId != other.pendingVintageId) return false
        if (pendingTasting != other.pendingTasting) return false
        if (error != other.error) return false
        if (flashEnabled != other.flashEnabled) return false
        return true
    }

    override fun hashCode(): Int {
        var result = step.hashCode()
        result = 31 * result + isUploading.hashCode()
        result = 31 * result + processingStatus.hashCode()
        result = 31 * result + (capturedImageBytes?.contentHashCode() ?: 0)
        result = 31 * result + (winesAddedQueueId?.hashCode() ?: 0)
        result = 31 * result + (pendingVintageId?.hashCode() ?: 0)
        result = 31 * result + (pendingTasting?.hashCode() ?: 0)
        result = 31 * result + (error?.hashCode() ?: 0)
        result = 31 * result + flashEnabled.hashCode()
        return result
    }
}

@Serializable
private data class QueueStatus(
    val status: String
)

@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val scanRepository: ScanRepository,
    private val tastingRepository: TastingRepository,
    private val client: SupabaseClient
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScannerUiState())
    val uiState: StateFlow<ScannerUiState> = _uiState.asStateFlow()

    fun onImageCaptured(imageBytes: ByteArray) {
        _uiState.value = _uiState.value.copy(
            capturedImageBytes = imageBytes,
            step = ScannerStep.RESULT
        )
    }

    fun toggleFlash() {
        _uiState.value = _uiState.value.copy(flashEnabled = !_uiState.value.flashEnabled)
    }

    fun retakePhoto() {
        _uiState.value = _uiState.value.copy(
            step = ScannerStep.CAMERA,
            capturedImageBytes = null,
            processingStatus = ProcessingStatus.IDLE,
            error = null
        )
    }

    fun uploadScan(imageData: ByteArray, userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isUploading = true,
                processingStatus = ProcessingStatus.UPLOADING,
                error = null,
            )

            // Single submission path, shared with the rest of the app. The upload and
            // the two database writes are atomic and non-cancellable inside the
            // repository, so navigating away mid-submit can no longer strand an
            // upload with no scan or queue row behind it.
            runCatching {
                scanRepository.submitScan(imageData, userId)
            }.onSuccess { queueId ->
                _uiState.value = _uiState.value.copy(
                    isUploading = false,
                    processingStatus = ProcessingStatus.PROCESSING,
                    winesAddedQueueId = queueId
                )
                // Start polling for completion
                pollProcessingStatus(queueId, userId)
            }.onFailure { throwable ->
                _uiState.value = _uiState.value.copy(
                    isUploading = false,
                    processingStatus = ProcessingStatus.FAILED,
                    error = throwable.message ?: "Upload failed"
                )
            }
        }
    }

    private fun pollProcessingStatus(queueId: String, userId: String) {
        viewModelScope.launch {
            val maxAttempts = 10
            val initialDelayMs = 1000L
            val maxDelayMs = 30000L
            var attempt = 0

            while (attempt < maxAttempts && _uiState.value.processingStatus == ProcessingStatus.PROCESSING) {
                runCatching {
                    val result = client.from("wines_added_queue")
                        .select {
                            filter { eq("id", queueId) }
                        }
                        .decodeSingle<QueueStatus>()

                    when (result.status) {
                        "completed" -> {
                            _uiState.value = _uiState.value.copy(
                                processingStatus = ProcessingStatus.COMPLETED
                            )
                            fetchPendingTasting(userId)
                            return@launch
                        }
                        "failed" -> {
                            _uiState.value = _uiState.value.copy(
                                processingStatus = ProcessingStatus.FAILED,
                                error = "Wine processing failed. Please try again."
                            )
                            return@launch
                        }
                    }
                }.onFailure {
                    // Continue polling on errors
                }

                // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s
                val delayMs = minOf(initialDelayMs * (1L shl attempt), maxDelayMs)
                delay(delayMs)
                attempt++
            }

            // Polling gave up. Previously this reported COMPLETED and an error at the
            // same time, which is contradictory: the UI could not tell a finished scan
            // from one we simply stopped watching.
            if (_uiState.value.processingStatus == ProcessingStatus.PROCESSING) {
                _uiState.value = _uiState.value.copy(
                    processingStatus = ProcessingStatus.TIMED_OUT,
                    error = "Processing is taking longer than expected. Your wine will appear in your list shortly."
                )
            }
        }
    }

    private fun fetchPendingTasting(userId: String) {
        viewModelScope.launch {
            runCatching {
                tastingRepository.fetchTastings(userId).firstOrNull()
            }.onSuccess { tasting ->
                _uiState.value = _uiState.value.copy(
                    pendingTasting = tasting,
                    pendingVintageId = tasting?.vintageId
                )
            }
        }
    }

    fun clearStatus() {
        _uiState.value = ScannerUiState()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
