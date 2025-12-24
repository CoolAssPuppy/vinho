package com.strategicnerds.vinho.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.strategicnerds.vinho.core.places.GooglePlacesService
import com.strategicnerds.vinho.core.places.PlaceSuggestion
import com.strategicnerds.vinho.data.model.TastingLocation
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PlaceAutocompleteField(
    text: String,
    onTextChange: (String) -> Unit,
    selectedPlace: TastingLocation?,
    onPlaceSelected: (TastingLocation?) -> Unit,
    placesService: GooglePlacesService,
    placeholder: String = "Search for a place",
    modifier: Modifier = Modifier
) {
    var suggestions by remember { mutableStateOf<List<PlaceSuggestion>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var searchJob by remember { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()

    fun searchForPlaces(query: String) {
        searchJob?.cancel()

        if (query.isBlank()) {
            suggestions = emptyList()
            isSearching = false
            return
        }

        isSearching = true
        searchJob = scope.launch {
            delay(300) // Debounce
            val results = placesService.searchPlaces(query)
            suggestions = results
        }
    }

    fun selectPlace(suggestion: PlaceSuggestion) {
        scope.launch {
            val details = placesService.getPlaceDetails(suggestion.placeId)
            if (details != null) {
                onTextChange(details.name)
                onPlaceSelected(
                    TastingLocation(
                        name = details.name,
                        address = details.formattedAddress ?: "",
                        city = placesService.extractCity(details.formattedAddress),
                        latitude = details.latitude,
                        longitude = details.longitude
                    )
                )
            } else {
                onTextChange(suggestion.description)
                onPlaceSelected(
                    TastingLocation(
                        name = suggestion.description,
                        address = "",
                        city = null,
                        latitude = null,
                        longitude = null
                    )
                )
            }
            suggestions = emptyList()
            isSearching = false
        }
    }

    Column(modifier = modifier) {
        OutlinedTextField(
            value = text,
            onValueChange = { newValue ->
                onTextChange(newValue)
                searchForPlaces(newValue)
            },
            label = { Text(placeholder) },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Rounded.LocationOn,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
            },
            trailingIcon = {
                if (text.isNotEmpty()) {
                    IconButton(
                        onClick = {
                            onTextChange("")
                            onPlaceSelected(null)
                            suggestions = emptyList()
                            isSearching = false
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Clear",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        AnimatedVisibility(
            visible = suggestions.isNotEmpty() && isSearching,
            enter = fadeIn() + slideInVertically(),
            exit = fadeOut() + slideOutVertically()
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column {
                    suggestions.forEachIndexed { index, suggestion ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectPlace(suggestion) }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Place,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = suggestion.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        if (index < suggestions.lastIndex) {
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                            )
                        }
                    }
                }
            }
        }
    }
}
