package com.vinho.android.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class Region(
    val id: UUID,
    val name: String,
    @SerialName("country_code") val countryCode: String? = null
)

@Serializable
data class Producer(
    val id: UUID,
    val name: String,
    @SerialName("description") val description: String? = null,
    val region: Region? = null,
    @SerialName("region_id") val regionId: UUID? = null
)

@Serializable
data class Wine(
    val id: UUID,
    val name: String,
    @SerialName("producer_id") val producerId: UUID,
    @SerialName("tasting_notes") val tastingNotes: String? = null,
    val producer: Producer? = null,
    val vintages: List<Vintage>? = null
)

@Serializable
data class Vintage(
    val id: UUID,
    @SerialName("wine_id") val wineId: UUID,
    val year: Int? = null,
    val wine: Wine? = null
)

@Serializable
data class Tasting(
    val id: UUID,
    @SerialName("user_id") val userId: UUID,
    @SerialName("vintage_id") val vintageId: UUID,
    val verdict: Int? = null,
    val notes: String? = null,
    @SerialName("detailed_notes") val detailedNotes: String? = null,
    @SerialName("tasted_at") val tastedAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("location_name") val locationName: String? = null,
    @SerialName("location_address") val locationAddress: String? = null,
    @SerialName("location_city") val locationCity: String? = null,
    @SerialName("location_latitude") val locationLatitude: Double? = null,
    @SerialName("location_longitude") val locationLongitude: Double? = null,
    val vintage: Vintage? = null
)

@Serializable
data class Scan(
    val id: UUID,
    @SerialName("user_id") val userId: UUID,
    @SerialName("image_path") val imagePath: String,
    @SerialName("ocr_text") val ocrText: String? = null,
    @SerialName("matched_vintage_id") val matchedVintageId: UUID? = null,
    val confidence: Double? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("scan_image_url") val scanImageUrl: String? = null,
    val matchedVintage: Vintage? = null
)

@Serializable
data class UserProfile(
    val id: UUID,
    val email: String? = null,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    val description: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("wine_preferences") val winePreferences: String? = null,
    @SerialName("favorite_regions") val favoriteRegions: List<String>? = null,
    @SerialName("favorite_varietals") val favoriteVarietals: List<String>? = null,
    @SerialName("favorite_styles") val favoriteStyles: List<String>? = null,
    @SerialName("price_range") val priceRange: String? = null,
    @SerialName("tasting_note_style") val tastingNoteStyle: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val fullName: String
        get() = listOfNotNull(firstName, lastName).joinToString(" ").ifBlank { email.orEmpty() }
}

@Serializable
data class WineStats(
    @SerialName("unique_wines") val uniqueWines: Int,
    @SerialName("total_tastings") val totalTastings: Int,
    @SerialName("unique_producers") val uniqueProducers: Int,
    @SerialName("unique_regions") val uniqueRegions: Int,
    @SerialName("unique_countries") val uniqueCountries: Int,
    val favorites: Int,
    @SerialName("average_rating") val averageRating: Double? = null,
    @SerialName("tastings_last_30_days") val tastingsLast30Days: Int,
    @SerialName("last_tasting_date") val lastTastingDate: String? = null
)

@Serializable
data class FeedItem(
    val type: String,
    val title: String,
    val description: String,
    @SerialName("image_url") val imageUrl: String? = null,
    val tags: List<String> = emptyList(),
    val timestamp: String,
    @SerialName("like_count") val likeCount: Int = 0,
    @SerialName("comment_count") val commentCount: Int = 0,
    @SerialName("is_liked") val isLiked: Boolean = false,
    @SerialName("is_saved") val isSaved: Boolean = false
)

@Serializable
data class WineQueue(
    val id: UUID,
    @SerialName("user_id") val userId: UUID,
    @SerialName("image_url") val imageUrl: String,
    @SerialName("ocr_text") val ocrText: String? = null,
    @SerialName("scan_id") val scanId: UUID? = null,
    val status: QueueStatus,
    @SerialName("processed_data") val processedData: ProcessedWineData? = null,
    @SerialName("error_message") val errorMessage: String? = null,
    @SerialName("retry_count") val retryCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("processed_at") val processedAt: String? = null
)

@Serializable
data class ProcessedWineData(
    val wine: Wine? = null,
    val vintage: Vintage? = null,
    val tasting: Tasting? = null
)

@Serializable
enum class QueueStatus {
    @SerialName("pending")
    PENDING,

    @SerialName("processing")
    PROCESSING,

    @SerialName("completed")
    COMPLETED,

    @SerialName("failed")
    FAILED
}
