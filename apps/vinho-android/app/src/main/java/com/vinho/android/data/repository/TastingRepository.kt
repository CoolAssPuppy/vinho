package com.vinho.android.data.repository

import com.vinho.android.data.model.Tasting
import com.vinho.android.data.model.WineStats
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.`in`
import io.github.jan.supabase.postgrest.query.eq
import io.github.jan.supabase.postgrest.query.order
import io.github.jan.supabase.postgrest.result.decodeList
import io.github.jan.supabase.postgrest.rpc
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TastingRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun fetchPagedTastings(page: Int, pageSize: Int = 12): List<Tasting> {
        val offset = page * pageSize
        val ids = client.rpc("get_tastings_with_sharing", mapOf("p_limit" to pageSize, "p_offset" to offset))
            .decodeList<Map<String, String>>()
            .mapNotNull { it["id"] }
        if (ids.isEmpty()) return emptyList()

        return client.from("tastings")
            .select(
                """
                    *,
                    vintages!vintage_id(
                        *,
                        wines!wine_id(
                            *,
                            producers!producer_id(*)
                        )
                    )
                """.trimIndent()
            ) {
                `in`("id", ids)
                order("tasted_at", false)
                order("created_at", false)
            }
            .decodeList()
    }

    suspend fun fetchTastingsForWine(wineId: UUID): List<Tasting> {
        val vintages = client.from("vintages")
            .select("id") {
                eq("wine_id", wineId)
            }
            .decodeList<Map<String, String>>()
            .mapNotNull { it["id"] }

        if (vintages.isEmpty()) return emptyList()

        return client.from("tastings")
            .select(
                """
                    *,
                    vintages!vintage_id(
                        *,
                        wines!wine_id(
                            *,
                            producers!producer_id(*)
                        )
                    )
                """.trimIndent()
            ) {
                `in`("vintage_id", vintages)
                order("tasted_at", false)
            }
            .decodeList()
    }

    suspend fun searchTastings(query: String, userId: UUID): List<Tasting> {
        if (query.isBlank()) return emptyList()
        val ids = client.rpc(
            "search_tastings_text",
            mapOf(
                "query" to query,
                "match_count" to "20",
                "user_id_filter" to userId.toString()
            )
        ).decodeList<Map<String, String>>()
            .mapNotNull { it["tasting_id"] }

        if (ids.isEmpty()) return emptyList()

        return client.from("tastings")
            .select(
                """
                    *,
                    vintages!vintage_id(
                        *,
                        wines!wine_id(
                            *,
                            producers!producer_id(*)
                        )
                    )
                """.trimIndent()
            ) {
                `in`("id", ids)
            }
            .decodeList()
    }

    suspend fun upsertTasting(tasting: Tasting) {
        client.from("tastings").upsert(tasting)
    }

    suspend fun deleteTasting(id: UUID) {
        client.from("tastings").delete {
            eq("id", id)
        }
    }

    suspend fun fetchStats(): WineStats? =
        client.from("user_wine_stats")
            .select()
            .decodeList<WineStats>()
            .firstOrNull()
}
