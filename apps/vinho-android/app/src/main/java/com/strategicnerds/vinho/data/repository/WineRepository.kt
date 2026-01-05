package com.strategicnerds.vinho.data.repository

import android.util.Log
import com.strategicnerds.vinho.data.model.ExpertRating
import com.strategicnerds.vinho.data.model.Wine
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.ktor.client.call.body
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "WineRepository"

@Serializable
private data class FetchExpertRatingRequest(
    val vintageId: String,
    val wineName: String,
    val producerName: String?,
    val year: Int? = null
)

@Serializable
private data class FetchExpertRatingResponse(
    val rating: Double? = null,
    @SerialName("rating_count") val ratingCount: Int? = null,
    val source: String? = null,
    @SerialName("source_url") val sourceUrl: String? = null,
    @SerialName("fetched_at") val fetchedAt: String? = null,
    @SerialName("is_cached") val isCached: Boolean = false
)

@Singleton
class WineRepository @Inject constructor(
    private val client: SupabaseClient
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun fetchWines(): List<Wine> =
        client.postgrest["wines"]
            .select(Columns.raw("*, producers!producer_id(*), vintages(*)"))
            .decodeList()

    suspend fun searchWines(query: String): List<Wine> {
        if (query.isBlank()) return emptyList()
        return client.postgrest["wines"]
            .select(Columns.raw("*, producers!producer_id(*)")) {
                filter { ilike("name", "%$query%") }
            }
            .decodeList()
    }

    suspend fun fetchExpertRating(
        vintageId: String,
        wineName: String,
        producerName: String?,
        year: Int? = null
    ): ExpertRating? {
        return try {
            val request = FetchExpertRatingRequest(
                vintageId = vintageId,
                wineName = wineName,
                producerName = producerName,
                year = year
            )
            val response = client.functions.invoke(
                function = "fetch-expert-rating",
                body = request,
                headers = Headers.build {
                    append(HttpHeaders.ContentType, "application/json")
                }
            )
            val responseBody: String = response.body()
            val parsed = json.decodeFromString<FetchExpertRatingResponse>(responseBody)

            if (parsed.rating != null && parsed.source != null && parsed.fetchedAt != null) {
                ExpertRating(
                    rating = parsed.rating,
                    ratingCount = parsed.ratingCount,
                    source = parsed.source,
                    sourceUrl = parsed.sourceUrl,
                    fetchedAt = parsed.fetchedAt,
                    isCached = parsed.isCached
                )
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch expert rating: ${e.message}", e)
            null
        }
    }
}
