package com.strategicnerds.vinho.data.repository

import android.util.Log
import com.strategicnerds.vinho.data.model.SharingConnection
import com.strategicnerds.vinho.data.model.UserSharingPreferences
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.ktor.client.call.body
import io.ktor.client.request.setBody
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.OffsetDateTime
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "SharingRepository"

@Serializable
private data class InviteBody(@SerialName("viewer_email") val viewerEmail: String)

@Serializable
data class InviteResult(
    val success: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

@Serializable
private data class PreferencesInsert(
    @SerialName("user_id") val userId: String,
    @SerialName("visible_sharers") val visibleSharers: List<String> = emptyList(),
)

@Singleton
class SharingRepository @Inject constructor(
    private val client: SupabaseClient
) {
    /** All connections where the current user is sharer or viewer, with profiles. */
    suspend fun fetchConnections(): List<SharingConnection> {
        return try {
            client.postgrest
                .rpc("get_sharing_connections_with_profiles")
                .decodeList()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch sharing connections: ${e.message}", e)
            emptyList()
        }
    }

    /** The current user's visibility preferences, creating a default row if absent. */
    suspend fun fetchPreferences(userId: String): UserSharingPreferences? {
        return try {
            val existing = client.postgrest["user_sharing_preferences"]
                .select { filter { eq("user_id", userId) } }
                .decodeSingleOrNull<UserSharingPreferences>()
            existing ?: createDefaultPreferences(userId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch sharing preferences: ${e.message}", e)
            null
        }
    }

    private suspend fun createDefaultPreferences(userId: String): UserSharingPreferences? {
        return try {
            client.postgrest["user_sharing_preferences"]
                .insert(PreferencesInsert(userId = userId)) { select() }
                .decodeSingleOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create default preferences: ${e.message}", e)
            null
        }
    }

    /** Invite a viewer by email via the send-sharing-invitation edge function. */
    suspend fun sendInvitation(email: String): InviteResult {
        return try {
            val response = client.functions.invoke("send-sharing-invitation") {
                setBody(InviteBody(viewerEmail = email))
            }
            response.body()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send invitation: ${e.message}", e)
            InviteResult(success = false, error = e.message ?: "Failed to send invitation")
        }
    }

    suspend fun acceptInvitation(connectionId: String): Boolean =
        updateStatus(connectionId, "accepted", setAcceptedAt = true)

    suspend fun rejectInvitation(connectionId: String): Boolean =
        updateStatus(connectionId, "rejected")

    suspend fun revokeSharing(connectionId: String): Boolean =
        updateStatus(connectionId, "revoked")

    private suspend fun updateStatus(
        connectionId: String,
        status: String,
        setAcceptedAt: Boolean = false,
    ): Boolean {
        return try {
            val now = OffsetDateTime.now().toString()
            val patch = buildMap {
                put("status", status)
                put("updated_at", now)
                if (setAcceptedAt) put("accepted_at", now)
            }
            client.postgrest["sharing_connections"]
                .update(patch) { filter { eq("id", connectionId) } }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set connection $connectionId -> $status: ${e.message}", e)
            false
        }
    }

    /** Add or remove a sharer from the current user's visible list. */
    suspend fun toggleSharerVisibility(
        prefs: UserSharingPreferences,
        sharerId: String,
        visible: Boolean,
    ): UserSharingPreferences? {
        return try {
            val updated = if (visible) {
                (prefs.visibleSharers + sharerId).distinct()
            } else {
                prefs.visibleSharers.filterNot { it == sharerId }
            }
            client.postgrest["user_sharing_preferences"].update(
                mapOf(
                    "visible_sharers" to updated,
                    "updated_at" to OffsetDateTime.now().toString(),
                )
            ) { filter { eq("user_id", prefs.userId) } }
            prefs.copy(visibleSharers = updated)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to toggle sharer visibility: ${e.message}", e)
            null
        }
    }
}
