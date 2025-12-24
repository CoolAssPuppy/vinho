package com.strategicnerds.vinho.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

@Serializable
data class SimilarWine(
    @SerialName("wine_id") val wineId: String,
    @SerialName("wine_name") val wineName: String,
    @SerialName("producer_name") val producerName: String,
    val similarity: Double,
    @SerialName("image_url") val imageUrl: String? = null,
    val region: String? = null,
    val country: String? = null,
    @SerialName("last_tasted") val lastTasted: String? = null
) {
    val matchPercentage: Int
        get() = (similarity * 100).toInt()

    val locationText: String?
        get() = when {
            region != null && country != null -> "$region, $country"
            region != null -> region
            country != null -> country
            else -> null
        }

    val lastTastedFormatted: String?
        get() {
            val date = lastTasted ?: return null
            return try {
                // Try ISO date-time with timezone
                val isoFormatter = DateTimeFormatter.ISO_DATE_TIME
                val parsed = LocalDate.parse(date.take(10))
                val displayFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy")
                parsed.format(displayFormatter)
            } catch (e: DateTimeParseException) {
                try {
                    // Try simple date format
                    val simpleFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
                    val parsed = LocalDate.parse(date.take(10), simpleFormatter)
                    val displayFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy")
                    parsed.format(displayFormatter)
                } catch (e: Exception) {
                    null
                }
            }
        }
}

@Serializable
data class SimilarWinesResponse(
    @SerialName("similar_wines") val similarWines: List<SimilarWine>,
    val count: Int? = null,
    @SerialName("based_on_count") val basedOnCount: Int? = null,
    @SerialName("recommendation_type") val recommendationType: String? = null,
    val message: String? = null
)

enum class RecommendationType(val value: String) {
    PERSONALIZED("personalized"),
    YOUR_FAVORITES("your_favorites"),
    NONE("none");

    val title: String
        get() = "Suggestions"

    val subtitle: String
        get() = when (this) {
            PERSONALIZED -> "Based on your top-rated wines"
            YOUR_FAVORITES, NONE -> "Based on visual similarity"
        }

    companion object {
        fun fromString(value: String?): RecommendationType {
            return entries.find { it.value == value } ?: YOUR_FAVORITES
        }
    }
}
