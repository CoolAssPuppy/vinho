package com.strategicnerds.vinho.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.statement.bodyAsText
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DataExportRepository @Inject constructor(
    private val client: SupabaseClient
) {
    suspend fun exportJson(): String {
        val response = client.functions.invoke("export-user-data")
        return response.bodyAsText()
    }
}
