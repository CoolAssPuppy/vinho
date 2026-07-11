package com.strategicnerds.vinho.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Profile summary embedded in a sharing connection (returned by the
 * get_sharing_connections_with_profiles RPC as a JSON object).
 */
@Serializable
data class SharingProfile(
    val id: String? = null,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
) {
    val displayName: String
        get() = listOfNotNull(firstName, lastName)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "Wine lover" }
}

/**
 * A sharing connection between a sharer (owner of the tastings) and a viewer.
 * Mirrors the iOS SharingConnection.
 */
@Serializable
data class SharingConnection(
    val id: String,
    @SerialName("sharer_id") val sharerId: String,
    @SerialName("viewer_id") val viewerId: String,
    val status: String,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("accepted_at") val acceptedAt: String? = null,
    @SerialName("sharer_profile") val sharerProfile: SharingProfile? = null,
    @SerialName("viewer_profile") val viewerProfile: SharingProfile? = null,
) {
    val isPending get() = status == "pending"
    val isAccepted get() = status == "accepted"
}

@Serializable
data class UserSharingPreferences(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("visible_sharers") val visibleSharers: List<String> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)
