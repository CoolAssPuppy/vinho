package com.strategicnerds.vinho.data.repository

import android.util.Log
import com.strategicnerds.vinho.data.model.Scan
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ScanRepository"

@Serializable
private data class ScanInsert(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("image_path") val imagePath: String,
    @SerialName("ocr_text") val ocrText: String? = null,
    @SerialName("matched_vintage_id") val matchedVintageId: String? = null,
    val confidence: Double? = null,
    @SerialName("scan_image_url") val scanImageUrl: String? = null
)

@Serializable
private data class WineQueueInsert(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("image_url") val imageUrl: String,
    @SerialName("ocr_text") val ocrText: String? = null,
    @SerialName("scan_id") val scanId: String? = null,
    val status: String = "pending",
    @SerialName("error_message") val errorMessage: String? = null,
    @SerialName("retry_count") val retryCount: Int = 0
)

@Singleton
class ScanRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun fetchScans(): List<Scan> {
        return try {
            client.postgrest["scans"]
                .select(
                    io.github.jan.supabase.postgrest.query.Columns.raw(
                        """
                        *,
                        vintages!matched_vintage_id(
                            *,
                            wines!wine_id(
                                *,
                                producers!producer_id(*)
                            )
                        )
                        """.trimIndent()
                    )
                )
                .decodeList()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch scans: ${e.message}", e)
            emptyList()
        }
    }

    suspend fun uploadScan(image: ByteArray, userId: String): String {
        try {
            val path = "${userId}/scan-${System.currentTimeMillis()}.jpg"
            client.storage.from("scans").upload(path, image) { upsert = false }
            val publicUrl = client.storage.from("scans").publicUrl(path)

            val scanId = UUID.randomUUID().toString()
            val scanInsert = ScanInsert(
                id = scanId,
                userId = userId,
                imagePath = path,
                ocrText = null,
                matchedVintageId = null,
                confidence = null,
                scanImageUrl = publicUrl
            )

            client.postgrest["scans"].insert(scanInsert)
            Log.d(TAG, "Successfully created scan: $scanId")

            val queueInsert = WineQueueInsert(
                id = UUID.randomUUID().toString(),
                userId = userId,
                imageUrl = publicUrl,
                ocrText = null,
                scanId = scanId,
                status = "pending",
                errorMessage = null,
                retryCount = 0
            )
            client.postgrest["wines_added_queue"].insert(queueInsert)
            Log.d(TAG, "Successfully queued scan for processing")

            client.functions.invoke("process-wine-queue")
            return scanId
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upload scan: ${e.message}", e)
            throw ScanRepositoryException("Failed to upload scan", e)
        }
    }
}

class ScanRepositoryException(
    override val message: String,
    override val cause: Throwable? = null
) : Exception(message, cause)
