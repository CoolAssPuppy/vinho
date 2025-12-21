package com.vinho.android.data.repository

import com.vinho.android.data.model.QueueStatus
import com.vinho.android.data.model.Scan
import com.vinho.android.data.model.WineQueue
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.result.decodeList
import io.github.jan.supabase.storage.storage
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScanRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun fetchScans(): List<Scan> =
        client.from("scans")
            .select(
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
            .decodeList()

    suspend fun uploadScan(image: ByteArray, userId: UUID): UUID {
        val path = "${userId}/scan-${System.currentTimeMillis()}.jpg"
        client.storage.from("scans").upload(path, image, upsert = false)
        val publicUrl = client.storage.from("scans").publicUrl(path)

        val scan = Scan(
            id = UUID.randomUUID(),
            userId = userId,
            imagePath = path,
            ocrText = null,
            matchedVintageId = null,
            confidence = null,
            createdAt = null,
            scanImageUrl = publicUrl,
            matchedVintage = null
        )

        client.from("scans").insert(scan)

        val queueItem = WineQueue(
            id = UUID.randomUUID(),
            userId = userId,
            imageUrl = publicUrl,
            ocrText = null,
            scanId = scan.id,
            status = QueueStatus.PENDING,
            processedData = null,
            errorMessage = null,
            retryCount = 0,
            createdAt = null,
            processedAt = null
        )
        client.from("wines_added_queue").insert(queueItem)
        client.functions.invoke("process-wine-queue")
        return scan.id
    }
}
