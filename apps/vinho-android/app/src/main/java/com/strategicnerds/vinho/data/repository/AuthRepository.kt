package com.strategicnerds.vinho.data.repository

import android.net.Uri
import android.util.Log
import com.strategicnerds.vinho.core.config.AppConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserSession
import io.github.jan.supabase.auth.providers.OAuthProvider
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "AuthRepository"

@Singleton
class AuthRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun currentSession(): UserSession? {
        // Wait for session to be loaded from storage (with timeout)
        val status = withTimeoutOrNull(5000L) {
            client.auth.sessionStatus.first { it !is SessionStatus.Initializing }
        }

        return when (status) {
            is SessionStatus.Authenticated -> {
                Log.d(TAG, "Session restored from storage")
                status.session
            }
            is SessionStatus.NotAuthenticated -> {
                Log.d(TAG, "No session found")
                null
            }
            else -> {
                // Timeout or other status - try fallback
                Log.d(TAG, "Session status timeout, trying fallback")
                client.auth.currentSessionOrNull()
            }
        }
    }

    fun sessionStatus() = client.auth.sessionStatus

    suspend fun signIn(email: String, password: String): UserSession? {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        return client.auth.currentSessionOrNull()
    }

    suspend fun signUp(email: String, password: String, fullName: String): UserSession? {
        client.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = buildJsonObject {
                put("full_name", JsonPrimitive(fullName))
            }
        }
        return client.auth.currentSessionOrNull()
    }

    suspend fun signInWithOAuth(provider: OAuthProvider) {
        client.auth.signInWith(provider)
    }

    suspend fun handleDeepLink(uri: Uri): UserSession? =
        client.auth.exchangeCodeForSession(uri.toString())

    suspend fun signOut() = client.auth.signOut()

    suspend fun resetPassword(email: String) {
        client.auth.resetPasswordForEmail(email)
    }

    suspend fun deleteAccount(accessToken: String): Boolean = withContext(Dispatchers.IO) {
        // Always use www.vinho.dev - redirects strip auth headers
        val url = URL("https://www.vinho.dev/api/account/delete")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Authorization", "Bearer $accessToken")
            setRequestProperty("Content-Type", "application/json")
            connectTimeout = 30_000  // 30 seconds
            readTimeout = 30_000     // 30 seconds
        }
        try {
            connection.connect()
            val success = connection.responseCode in 200..299
            success
        } finally {
            connection.disconnect()
        }
    }
}
