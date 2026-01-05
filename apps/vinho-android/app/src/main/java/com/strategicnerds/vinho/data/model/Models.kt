package com.strategicnerds.vinho.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PriceRange(
    val low: Int = 20,
    val high: Int = 100
)

@Serializable
data class WinePreferences(
    @SerialName("wine_types") val wineTypes: List<String>? = null,
    @SerialName("price_range") val priceRange: List<Int>? = null,
    @SerialName("collect_bottles") val collectBottles: Boolean? = null,
    @SerialName("tasting_note_style") val tastingNoteStyle: String? = null
)

@Serializable
data class Region(
    val id: String,
    val name: String,
    val country: String? = null,
    @SerialName("country_code") val countryCode: String? = null,
    @SerialName("climate_zone_id") val climateZoneId: Int? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Producer(
    val id: String,
    val name: String,
    @SerialName("description") val description: String? = null,
    val website: String? = null,
    @SerialName("region_id") val regionId: String? = null,
    val address: String? = null,
    val city: String? = null,
    @SerialName("postal_code") val postalCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("regions") val region: Region? = null
)

@Serializable
data class Wine(
    val id: String,
    val name: String,
    @SerialName("producer_id") val producerId: String? = null,
    @SerialName("is_nv") val isNV: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("producers") val producer: Producer? = null,
    val vintages: List<Vintage>? = null,
    @SerialName("wine_type") val wineType: String? = null,
    val color: String? = null,
    val style: String? = null,
    @SerialName("food_pairings") val foodPairings: List<String>? = null,
    @SerialName("serving_temperature") val servingTemperature: String? = null,
    @SerialName("tasting_notes") val tastingNotes: String? = null,
    val varietal: String? = null
)

@Serializable
data class Vintage(
    val id: String,
    @SerialName("wine_id") val wineId: String? = null,
    val year: Int? = null,
    val abv: Double? = null,
    @SerialName("vineyard_id") val vineyardId: String? = null,
    @SerialName("climate_zone_id") val climateZoneId: Int? = null,
    @SerialName("soil_type_id") val soilTypeId: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("wines") val wine: Wine? = null,
    @SerialName("community_rating") val communityRating: Double? = null,
    @SerialName("community_rating_count") val communityRatingCount: Int? = null
)

@Serializable
data class Tasting(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("vintage_id") val vintageId: String,
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
    @SerialName("vintages") val vintage: Vintage? = null,
    @SerialName("profiles") val sharedBy: SharedTastingInfo? = null
) {
    val isShared: Boolean
        get() = sharedBy != null
}

@Serializable
data class SharedTastingInfo(
    val id: String,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null
)

@Serializable
data class Scan(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("image_path") val imagePath: String,
    @SerialName("ocr_text") val ocrText: String? = null,
    @SerialName("matched_vintage_id") val matchedVintageId: String? = null,
    val confidence: Double? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("scan_image_url") val scanImageUrl: String? = null,
    @SerialName("vintages") val matchedVintage: Vintage? = null
)

@Serializable
data class UserProfile(
    val id: String,
    val email: String? = null,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    val description: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("wine_preferences") val winePreferences: WinePreferences? = null,
    @SerialName("favorite_regions") val favoriteRegions: List<String>? = null,
    @SerialName("favorite_varietals") val favoriteVarietals: List<String>? = null,
    @SerialName("favorite_styles") val favoriteStyles: List<String>? = null,
    @SerialName("price_range") val priceRange: PriceRange? = null,
    @SerialName("tasting_note_style") val tastingNoteStyle: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val fullName: String
        get() = listOfNotNull(firstName, lastName).joinToString(" ").ifBlank { email.orEmpty() }

    val bio: String?
        get() = description
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
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("image_url") val imageUrl: String,
    @SerialName("ocr_text") val ocrText: String? = null,
    @SerialName("scan_id") val scanId: String? = null,
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

@Serializable
data class ExpertRating(
    val rating: Double? = null,
    val ratingCount: Int? = null,
    val source: String,
    val sourceUrl: String? = null,
    val fetchedAt: String,
    val isCached: Boolean
) {
    /**
     * Formats the "last updated" text for display
     */
    fun lastUpdatedText(): String {
        return try {
            val fetchedDate = java.time.Instant.parse(fetchedAt)
            val now = java.time.Instant.now()
            val duration = java.time.Duration.between(fetchedDate, now)

            when {
                duration.toMinutes() < 1 -> "Just now"
                duration.toHours() < 1 -> "Updated ${duration.toMinutes()}m ago"
                duration.toDays() < 1 -> "Updated ${duration.toHours()}h ago"
                duration.toDays() < 7 -> "Updated ${duration.toDays()}d ago"
                else -> {
                    val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM d")
                        .withZone(java.time.ZoneId.systemDefault())
                    "Updated ${formatter.format(fetchedDate)}"
                }
            }
        } catch (e: Exception) {
            "Updated recently"
        }
    }
}
