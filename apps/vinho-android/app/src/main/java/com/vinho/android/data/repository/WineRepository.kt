package com.vinho.android.data.repository

import com.vinho.android.data.model.Wine
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.or
import io.github.jan.supabase.postgrest.query.ilike
import io.github.jan.supabase.postgrest.result.decodeList
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WineRepository @Inject constructor(
    private val client: SupabaseClient
) {
    suspend fun fetchWines(): List<Wine> =
        client.from("wines")
            .select("*, producers!producer_id(*), vintages(*)")
            .decodeList()

    suspend fun searchWines(query: String): List<Wine> {
        if (query.isBlank()) return emptyList()
        return client.from("wines")
            .select("*, producers!producer_id(*)") {
                or {
                    ilike("name", "%$query%")
                }
            }
            .decodeList()
    }
}
