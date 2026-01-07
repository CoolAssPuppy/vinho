package com.strategicnerds.vinho.core.recommendations

import android.util.Log
import com.strategicnerds.vinho.core.config.AppConfig
import com.strategicnerds.vinho.data.model.RecommendationType
import com.strategicnerds.vinho.data.model.SimilarWine
import com.strategicnerds.vinho.data.model.SimilarWinesResponse
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import com.strategicnerds.vinho.core.security.CertificatePinnerConfig
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "VisualSimilarityService"

data class SimilarWinesResult(
    val wines: List<SimilarWine>,
    val recommendationType: RecommendationType
)

sealed class SimilarityError : Exception() {
    data object NotAuthenticated : SimilarityError() {
        private fun readResolve(): Any = NotAuthenticated
        override val message: String = "Please sign in to see recommendations"
    }
    data object InvalidResponse : SimilarityError() {
        private fun readResolve(): Any = InvalidResponse
        override val message: String = "Invalid response from server"
    }
    data class ServerError(val code: Int) : SimilarityError() {
        override val message: String = "Server error ($code)"
    }
}

@Singleton
class VisualSimilarityService @Inject constructor(
    private val supabaseClient: SupabaseClient
) {
    private val client = OkHttpClient.Builder()
        .certificatePinner(CertificatePinnerConfig.certificatePinner)
        .build()
    private val json = Json { ignoreUnknownKeys = true }
    // Always use www.vinho.dev - redirects from vinho.dev strip auth headers
    private val baseUrl = "https://www.vinho.dev"

    suspend fun fetchSimilarWines(limit: Int = 6): SimilarWinesResult = withContext(Dispatchers.IO) {
        // Get current access token
        val accessToken = getAccessToken() ?: throw SimilarityError.NotAuthenticated

        // Try the request
        val result = makeRequest(accessToken, limit)

        // If 401, try refreshing token and retry once
        if (result.isUnauthorized) {
            Log.d(TAG, "Got 401, attempting token refresh and retry")
            try {
                supabaseClient.auth.refreshCurrentSession()
                val freshToken = supabaseClient.auth.currentSessionOrNull()?.accessToken
                if (freshToken != null && freshToken != accessToken) {
                    Log.d(TAG, "Token refreshed, retrying request")
                    val retryResult = makeRequest(freshToken, limit)
                    if (!retryResult.isUnauthorized) {
                        return@withContext retryResult.getOrThrow()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Token refresh failed: ${e.message}")
            }
            throw SimilarityError.NotAuthenticated
        }

        result.getOrThrow()
    }

    private suspend fun getAccessToken(): String? {
        // Wait for session to be loaded (with timeout)
        val sessionStatus = withTimeoutOrNull(5000L) {
            supabaseClient.auth.sessionStatus.first { status ->
                status !is SessionStatus.Initializing
            }
        }

        return when (sessionStatus) {
            is SessionStatus.Authenticated -> {
                Log.d(TAG, "Session authenticated, user: ${sessionStatus.session.user?.id}")
                sessionStatus.session.accessToken
            }
            else -> {
                val session = supabaseClient.auth.currentSessionOrNull()
                if (session != null) {
                    Log.d(TAG, "Using fallback session")
                    session.accessToken
                } else {
                    Log.e(TAG, "No authenticated session found")
                    null
                }
            }
        }
    }

    private sealed class RequestResult {
        data class Success(val data: SimilarWinesResult) : RequestResult()
        data object Unauthorized : RequestResult()
        data class Error(val error: SimilarityError) : RequestResult()

        val isUnauthorized: Boolean get() = this is Unauthorized

        fun getOrThrow(): SimilarWinesResult = when (this) {
            is Success -> data
            is Unauthorized -> throw SimilarityError.NotAuthenticated
            is Error -> throw error
        }
    }

    private fun makeRequest(accessToken: String, limit: Int): RequestResult {
        Log.d(TAG, "Fetching similar wines...")

        val request = Request.Builder()
            .url("$baseUrl/api/wines/similar-for-user?limit=$limit")
            .get()
            .addHeader("Authorization", "Bearer $accessToken")
            .addHeader("Content-Type", "application/json")
            .build()

        return client.newCall(request).execute().use { response ->
            Log.d(TAG, "Response code: ${response.code}")
            when (response.code) {
                200 -> {
                    val body = response.body?.string() ?: return@use RequestResult.Error(SimilarityError.InvalidResponse)
                    Log.d(TAG, "Response: ${body.take(200)}...")
                    val result = json.decodeFromString<SimilarWinesResponse>(body)
                    RequestResult.Success(
                        SimilarWinesResult(
                            wines = result.similarWines,
                            recommendationType = RecommendationType.fromString(result.recommendationType)
                        )
                    )
                }
                401 -> {
                    Log.e(TAG, "Unauthorized - token may be expired")
                    RequestResult.Unauthorized
                }
                else -> {
                    val body = response.body?.string()
                    Log.e(TAG, "Server error ${response.code}: $body")
                    RequestResult.Error(SimilarityError.ServerError(response.code))
                }
            }
        }
    }
}
