package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.repository.ScanRepository
import com.strategicnerds.vinho.data.repository.TastingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import java.util.UUID
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
    FAILED
}

data class ScannerUiState(
    val step: ScannerStep = ScannerStep.CAMERA,
    val isUploading: Boolean = false,
    val processingStatus: ProcessingStatus = ProcessingStatus.IDLE,
    val capturedImageBytes: ByteArray? = null,
    val successScanId: String? = null,
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
        if (successScanId != other.successScanId) return false
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
        result = 31 * result + (successScanId?.hashCode() ?: 0)
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

@Serializable
private data class ScanInsert(
    val id: String,
    val user_id: String,
    val image_path: String,
    val scan_image_url: String
)

@Serializable
private data class QueueInsert(
    val id: String,
    val user_id: String,
    val image_url: String,
    val scan_id: String,
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
                successScanId = null
            )

            runCatching {
                val scanId = UUID.randomUUID().toString()
                val queueId = UUID.randomUUID().toString()
                val fileName = "$userId/${System.currentTimeMillis()}.jpg"

                // Upload image to storage
                client.storage["scans"].upload(fileName, imageData) { upsert = true }
                val publicUrl = client.storage["scans"].publicUrl(fileName)

                // Insert into scans table
                client.from("scans").insert(
                    ScanInsert(
                        id = scanId,
                        user_id = userId,
                        image_path = fileName,
                        scan_image_url = publicUrl
                    )
                )

                // Insert into wines_added_queue
                client.from("wines_added_queue").insert(
                    QueueInsert(
                        id = queueId,
                        user_id = userId,
                        image_url = publicUrl,
                        scan_id = scanId,
                        status = "pending"
                    )
                )

                // Trigger edge function (non-blocking)
                launch {
                    runCatching {
                        client.functions.invoke("process-wine-queue")
                    }
                }

                Pair(scanId, queueId)
            }.onSuccess { (scanId, queueId) ->
                _uiState.value = _uiState.value.copy(
                    isUploading = false,
                    processingStatus = ProcessingStatus.PROCESSING,
                    successScanId = scanId,
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

            // Timeout - still processing
            if (_uiState.value.processingStatus == ProcessingStatus.PROCESSING) {
                _uiState.value = _uiState.value.copy(
                    processingStatus = ProcessingStatus.COMPLETED,
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
