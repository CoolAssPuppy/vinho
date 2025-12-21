package com.vinho.android.data.repository

import android.net.Uri
import com.vinho.android.core.config.AppConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.UserSession
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.gotrue.providers.OAuthProvider
import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun currentSession(): UserSession? = client.gotrue.currentSessionOrNull()

    suspend fun sessionStatus() = client.gotrue.sessionStatus

    suspend fun signIn(email: String, password: String): UserSession =
        client.gotrue.signInWith(Email) {
            this.email = email
            this.password = password
        }

    suspend fun signUp(email: String, password: String, fullName: String): UserSession =
        client.gotrue.signUpWith(Email) {
            this.email = email
            this.password = password
            data = mapOf("full_name" to fullName)
        }

    suspend fun signInWithOAuth(provider: OAuthProvider) {
        client.gotrue.signInWith(provider) {
            redirectUrl = "vinho://auth-callback"
        }
    }

    suspend fun handleDeepLink(uri: Uri): UserSession? =
        client.gotrue.exchangeCodeForSession(uri.toString())

    suspend fun signOut() = client.gotrue.signOut()

    suspend fun deleteAccount(accessToken: String): Boolean = withContext(Dispatchers.IO) {
        val url = URL("${AppConfig.apiBaseUrl}/api/account/delete")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Authorization", "Bearer $accessToken")
            setRequestProperty("Content-Type", "application/json")
        }
        connection.connect()
        val success = connection.responseCode in 200..299
        connection.disconnect()
        success
    }
}
