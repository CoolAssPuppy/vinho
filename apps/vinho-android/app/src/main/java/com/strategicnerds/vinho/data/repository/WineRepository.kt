package com.strategicnerds.vinho.data.repository

import com.strategicnerds.vinho.data.model.Wine
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WineRepository @Inject constructor(
    private val client: SupabaseClient
) {
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
}
