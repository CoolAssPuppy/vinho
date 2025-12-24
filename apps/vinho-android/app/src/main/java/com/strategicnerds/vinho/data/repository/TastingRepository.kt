package com.strategicnerds.vinho.data.repository

import android.util.Log
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.model.WineStats
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.rpc
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "TastingRepository"

@Serializable
private data class TastingIdResponse(
    val id: String
)

@Serializable
private data class SearchTastingResponse(
    @SerialName("tasting_id")
    val tastingId: String
)

@Serializable
private data class TastingInsert(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("vintage_id") val vintageId: String,
    val verdict: Int? = null,
    val notes: String? = null,
    @SerialName("detailed_notes") val detailedNotes: String? = null,
    @SerialName("tasted_at") val tastedAt: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("location_name") val locationName: String? = null,
    @SerialName("location_address") val locationAddress: String? = null,
    @SerialName("location_city") val locationCity: String? = null,
    @SerialName("location_latitude") val locationLatitude: Double? = null,
    @SerialName("location_longitude") val locationLongitude: Double? = null
) {
    companion object {
        fun fromTasting(tasting: Tasting) = TastingInsert(
            id = tasting.id,
            userId = tasting.userId,
            vintageId = tasting.vintageId,
            verdict = tasting.verdict,
            notes = tasting.notes,
            detailedNotes = tasting.detailedNotes,
            tastedAt = tasting.tastedAt,
            imageUrl = tasting.imageUrl,
            locationName = tasting.locationName,
            locationAddress = tasting.locationAddress,
            locationCity = tasting.locationCity,
            locationLatitude = tasting.locationLatitude,
            locationLongitude = tasting.locationLongitude
        )
    }
}

@Singleton
class TastingRepository @Inject constructor(
    private val client: SupabaseClient
) {

    private val tastingColumns = Columns.raw(
        """
            *,
            vintages!vintage_id(
                *,
                wines!wine_id(
                    *,
                    producers!producer_id(
                        *,
                        regions!region_id(*)
                    )
                )
            )
        """.trimIndent()
    )

    suspend fun fetchPagedTastings(page: Int, pageSize: Int = 50): List<Tasting> {
        return try {
            val offset = page * pageSize
            val response = client.postgrest.rpc(
                "get_tastings_with_sharing",
                mapOf("p_limit" to pageSize, "p_offset" to offset)
            ).decodeList<TastingIdResponse>()

            val ids = response.map { it.id }
            if (ids.isEmpty()) return emptyList()

            client.postgrest["tastings"]
                .select(tastingColumns) {
                    filter { isIn("id", ids) }
                    order("tasted_at", Order.DESCENDING)
                    order("created_at", Order.DESCENDING)
                }
                .decodeList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun fetchTastingsForWine(wineId: String): List<Tasting> {
        return try {
            val vintages = client.postgrest["vintages"]
                .select(Columns.list("id")) {
                    filter { eq("wine_id", wineId) }
                }
                .decodeList<TastingIdResponse>()
                .map { it.id }

            if (vintages.isEmpty()) return emptyList()

            client.postgrest["tastings"]
                .select(tastingColumns) {
                    filter { isIn("vintage_id", vintages) }
                    order("tasted_at", Order.DESCENDING)
                }
                .decodeList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun searchTastings(query: String, userId: String): List<Tasting> {
        if (query.isBlank()) return emptyList()
        return try {
            val response = client.postgrest.rpc(
                "search_tastings_text",
                mapOf(
                    "query" to query,
                    "match_count" to 20,
                    "user_id_filter" to userId
                )
            ).decodeList<SearchTastingResponse>()

            val ids = response.map { it.tastingId }
            if (ids.isEmpty()) return emptyList()

            client.postgrest["tastings"]
                .select(tastingColumns) {
                    filter { isIn("id", ids) }
                }
                .decodeList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun fetchTastings(userId: String): List<Tasting> {
        return try {
            client.postgrest["tastings"]
                .select(tastingColumns) {
                    filter { eq("user_id", userId) }
                    order("created_at", Order.DESCENDING)
                    limit(50)
                }
                .decodeList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun upsertTasting(tasting: Tasting) {
        try {
            val insertData = TastingInsert.fromTasting(tasting)
            client.postgrest["tastings"].upsert(insertData)
            Log.d(TAG, "Successfully saved tasting: ${tasting.id}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save tasting: ${e.message}", e)
            throw TastingRepositoryException("Failed to save tasting", e)
        }
    }

    suspend fun deleteTasting(id: String) {
        try {
            client.postgrest["tastings"].delete {
                filter { eq("id", id) }
            }
            Log.d(TAG, "Successfully deleted tasting: $id")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete tasting: ${e.message}", e)
            throw TastingRepositoryException("Failed to delete tasting", e)
        }
    }

    suspend fun fetchStats(): WineStats? {
        return try {
            client.postgrest["user_wine_stats"]
                .select()
                .decodeSingleOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch stats: ${e.message}", e)
            null
        }
    }
}

class TastingRepositoryException(
    override val message: String,
    override val cause: Throwable? = null
) : Exception(message, cause)
