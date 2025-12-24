package com.strategicnerds.vinho.core.places

import com.strategicnerds.vinho.core.config.AppConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class PlaceSuggestion(
    val placeId: String,
    val description: String
)

@Serializable
data class PlaceDetails(
    val name: String,
    val formattedAddress: String?,
    val latitude: Double?,
    val longitude: Double?
)

@Singleton
class GooglePlacesService @Inject constructor() {

    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun searchPlaces(
        query: String,
        types: List<String> = listOf("restaurant", "bar", "cafe", "food")
    ): List<PlaceSuggestion> = withContext(Dispatchers.IO) {
        val apiKey = AppConfig.mapsApiKey
        if (apiKey.isBlank()) return@withContext emptyList()
        if (query.isBlank()) return@withContext emptyList()

        val bodyJson = buildString {
            append("{\"input\":\"$query\"")
            if (types.isNotEmpty()) {
                append(",\"includedPrimaryTypes\":[${types.joinToString(",") { "\"$it\"" }}]")
            }
            append("}")
        }

        val request = Request.Builder()
            .url("https://places.googleapis.com/v1/places:autocomplete")
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .addHeader("Content-Type", "application/json")
            .addHeader("X-Goog-Api-Key", apiKey)
            .build()

        runCatching {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext emptyList()
                val body = response.body?.string() ?: return@withContext emptyList()
                val apiResponse = json.decodeFromString<PlacesAutocompleteResponse>(body)
                apiResponse.suggestions?.mapNotNull { suggestion ->
                    val placeId = suggestion.placePrediction?.placeId
                    val text = suggestion.placePrediction?.text?.text
                    if (placeId != null && text != null) {
                        PlaceSuggestion(placeId = placeId, description = text)
                    } else null
                } ?: emptyList()
            }
        }.getOrElse { emptyList() }
    }

    suspend fun getPlaceDetails(placeId: String): PlaceDetails? = withContext(Dispatchers.IO) {
        val apiKey = AppConfig.mapsApiKey
        if (apiKey.isBlank()) return@withContext null

        val request = Request.Builder()
            .url("https://places.googleapis.com/v1/places/$placeId")
            .get()
            .addHeader("X-Goog-Api-Key", apiKey)
            .addHeader("X-Goog-FieldMask", "displayName,formattedAddress,location")
            .build()

        runCatching {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val body = response.body?.string() ?: return@withContext null
                val apiResponse = json.decodeFromString<PlaceDetailsResponse>(body)
                PlaceDetails(
                    name = apiResponse.displayName?.text ?: "",
                    formattedAddress = apiResponse.formattedAddress,
                    latitude = apiResponse.location?.latitude,
                    longitude = apiResponse.location?.longitude
                )
            }
        }.getOrNull()
    }

    fun extractCity(address: String?): String? {
        if (address == null) return null
        val components = address.split(",")
        return if (components.size >= 2) {
            components[components.size - 2].trim()
        } else null
    }
}

@Serializable
private data class PlacesAutocompleteResponse(
    val suggestions: List<Suggestion>? = null
) {
    @Serializable
    data class Suggestion(
        val placePrediction: PlacePrediction? = null
    )

    @Serializable
    data class PlacePrediction(
        val placeId: String? = null,
        val text: TextValue? = null
    )

    @Serializable
    data class TextValue(
        val text: String? = null
    )
}

@Serializable
private data class PlaceDetailsResponse(
    val displayName: DisplayName? = null,
    val formattedAddress: String? = null,
    val location: Location? = null
) {
    @Serializable
    data class DisplayName(
        val text: String? = null
    )

    @Serializable
    data class Location(
        val latitude: Double,
        val longitude: Double
    )
}
