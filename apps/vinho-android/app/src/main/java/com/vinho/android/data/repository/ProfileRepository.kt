package com.vinho.android.data.repository

import com.vinho.android.data.model.UserProfile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.eq
import io.github.jan.supabase.postgrest.query.filter
import io.github.jan.supabase.postgrest.query.limit
import io.github.jan.supabase.postgrest.result.PostgrestResult
import io.github.jan.supabase.postgrest.result.decodeList
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(
    private val client: SupabaseClient
) {

    suspend fun fetchProfile(id: UUID): UserProfile? =
        client.from("profiles")
            .select {
                filter { eq("id", id) }
                limit(1)
            }
            .decodeList<UserProfile>()
            .firstOrNull()

    suspend fun upsertProfile(profile: UserProfile): PostgrestResult =
        client.from("profiles").upsert(profile)

    suspend fun updateAvatar(profileId: UUID, avatarUrl: String): PostgrestResult =
        client.from("profiles").update(
            mapOf(
                "avatar_url" to avatarUrl
            )
        ) {
            filter { eq("id", profileId) }
        }
}
