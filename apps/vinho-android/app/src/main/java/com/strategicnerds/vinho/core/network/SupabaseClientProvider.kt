package com.strategicnerds.vinho.core.network

import android.content.Context
import com.russhwolf.settings.Settings
import com.russhwolf.settings.SharedPreferencesSettings
import com.strategicnerds.vinho.core.config.AppConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.FlowType
import io.github.jan.supabase.auth.SettingsSessionManager
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupabaseClientProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val settings: Settings by lazy {
        SharedPreferencesSettings(
            context.getSharedPreferences("supabase_session", Context.MODE_PRIVATE)
        )
    }

    val client: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = AppConfig.supabaseUrl,
            supabaseKey = AppConfig.supabaseAnonKey
        ) {
            install(Postgrest)
            install(Storage)
            install(Functions)
            install(Auth) {
                flowType = FlowType.PKCE
                scheme = "vinho"
                host = "auth-callback"
                sessionManager = SettingsSessionManager(settings)
            }
        }
    }
}
