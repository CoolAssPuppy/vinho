package com.strategicnerds.vinho.data.repository

import android.util.Log
import com.strategicnerds.vinho.data.model.Scan
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ScanRepository"

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

    /**
     * Uploads a scan image and atomically enqueues it for processing.
     *
     * This is the single scan submission path for Android. It used to be duplicated
     * here and inline in ScannerViewModel, with divergent filenames and field
     * handling, and both copies ran the storage upload and two table inserts as
     * separate steps. If the caller died partway the work half-applied, leaving an
     * upload with no scan row (the 2026-07-04/05 lost-scan incident).
     *
     * Two things prevent that now. The database writes go through the [submit_scan]
     * RPC so they commit together, and the whole body runs in [NonCancellable] so
     * cancelling viewModelScope (screen destroyed, user navigates away) cannot
     * abandon it midway.
     *
     * @return the `wines_added_queue` id, used to observe processing status.
     */
    suspend fun submitScan(image: ByteArray, userId: String): String =
        withContext(NonCancellable) {
            try {
                // Matches the iOS and web convention: <uid>/<timestamp>.jpg. The uid
                // prefix is required by the storage RLS policy and by
                // repair_orphaned_scans().
                val path = "$userId/${System.currentTimeMillis()}.jpg"
                client.storage.from("scans").upload(path, image) { upsert = false }
                val publicUrl = client.storage.from("scans").publicUrl(path)

                // submit_scan returns a bare uuid, which PostgREST renders as a JSON
                // string, so decode the scalar rather than a row shape.
                val result = client.postgrest.rpc(
                    "submit_scan",
                    buildJsonObject {
                        put("p_image_path", path)
                        put("p_image_url", publicUrl)
                    }
                )
                val queueId = Json.decodeFromString<String>(result.data)

                // Best-effort nudge so processing starts before the 5-minute cron
                // tick. The queue row already exists, so cron recovers a failure here.
                runCatching { client.functions.invoke("process-wine-queue") }
                    .onFailure {
                        Log.w(TAG, "process-wine-queue nudge failed, cron will pick it up", it)
                    }

                queueId
            } catch (e: Exception) {
                Log.e(TAG, "Failed to submit scan: ${e.message}", e)
                throw ScanRepositoryException("Failed to submit scan", e)
            }
        }
}

class ScanRepositoryException(
    override val message: String,
    override val cause: Throwable? = null
) : Exception(message, cause)
