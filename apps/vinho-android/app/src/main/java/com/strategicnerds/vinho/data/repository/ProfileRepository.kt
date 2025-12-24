package com.strategicnerds.vinho.data.repository

import android.util.Log
import com.strategicnerds.vinho.data.model.UserProfile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ProfileRepository"

@Serializable
private data class ProfileInsert(
    val id: String,
    val email: String? = null,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    val description: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("favorite_regions") val favoriteRegions: List<String>? = null,
    @SerialName("favorite_varietals") val favoriteVarietals: List<String>? = null,
    @SerialName("favorite_styles") val favoriteStyles: List<String>? = null,
    @SerialName("tasting_note_style") val tastingNoteStyle: String? = null
) {
    companion object {
        fun fromProfile(profile: UserProfile) = ProfileInsert(
            id = profile.id,
            email = profile.email,
            firstName = profile.firstName,
            lastName = profile.lastName,
            description = profile.description,
            avatarUrl = profile.avatarUrl,
            favoriteRegions = profile.favoriteRegions,
            favoriteVarietals = profile.favoriteVarietals,
            favoriteStyles = profile.favoriteStyles,
            tastingNoteStyle = profile.tastingNoteStyle
        )
    }
}

@Singleton
class ProfileRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun fetchProfile(id: String): UserProfile? {
        return try {
            client.postgrest["profiles"]
                .select { filter { eq("id", id) } }
                .decodeSingleOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch profile: ${e.message}", e)
            null
        }
    }

    suspend fun upsertProfile(profile: UserProfile) {
        try {
            val insertData = ProfileInsert.fromProfile(profile)
            client.postgrest["profiles"].upsert(insertData)
            Log.d(TAG, "Successfully saved profile: ${profile.id}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save profile: ${e.message}", e)
            throw ProfileRepositoryException("Failed to save profile", e)
        }
    }

    suspend fun updateAvatar(profileId: String, avatarUrl: String) {
        try {
            client.postgrest["profiles"].update(
                mapOf("avatar_url" to avatarUrl)
            ) { filter { eq("id", profileId) } }
            Log.d(TAG, "Successfully updated avatar for: $profileId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update avatar: ${e.message}", e)
            throw ProfileRepositoryException("Failed to update avatar", e)
        }
    }
}

class ProfileRepositoryException(
    override val message: String,
    override val cause: Throwable? = null
) : Exception(message, cause)
