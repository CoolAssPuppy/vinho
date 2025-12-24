package com.strategicnerds.vinho.core.config

import com.strategicnerds.vinho.BuildConfig

object AppConfig {
    val supabaseUrl: String
        get() = BuildConfig.SUPABASE_URL.ifBlank { error("Missing SUPABASE_URL. Add it to local.properties.") }

    val supabaseAnonKey: String
        get() = BuildConfig.SUPABASE_ANON_KEY.ifBlank { error("Missing SUPABASE_ANON_KEY. Add it to local.properties.") }

    val apiBaseUrl: String
        get() = BuildConfig.VINHO_API_BASE_URL

    val mapsApiKey: String
        get() = BuildConfig.MAPS_API_KEY

    val posthogApiKey: String
        get() = BuildConfig.POSTHOG_API_KEY.ifBlank { "" }

    val posthogHost: String
        get() = BuildConfig.POSTHOG_HOST.ifBlank { "https://app.posthog.com" }
}
