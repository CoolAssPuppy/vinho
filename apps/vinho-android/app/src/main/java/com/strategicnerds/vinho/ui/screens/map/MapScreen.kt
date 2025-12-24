package com.strategicnerds.vinho.ui.screens.map

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Layers
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.WineBar
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.model.WineStats
import java.time.LocalDate
import java.time.format.DateTimeFormatter

enum class MapViewMode {
    TASTINGS,
    REGIONS
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    tastings: List<Tasting>,
    stats: WineStats?,
    onTastingClick: (Tasting) -> Unit = {}
) {
    var mapViewMode by remember { mutableStateOf(MapViewMode.TASTINGS) }
    var selectedTasting by remember { mutableStateOf<Tasting?>(null) }
    var showTastingSheet by remember { mutableStateOf(false) }

    val tastingsWithLocation = tastings.filter {
        it.locationLatitude != null && it.locationLongitude != null
    }

    val defaultLocation = if (tastingsWithLocation.isNotEmpty()) {
        val first = tastingsWithLocation.first()
        LatLng(first.locationLatitude!!, first.locationLongitude!!)
    } else {
        LatLng(48.8566, 2.3522)
    }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(defaultLocation, 4f)
    }

    val mapProperties = remember {
        MapProperties(
            mapType = MapType.NORMAL,
            isMyLocationEnabled = false
        )
    }

    val mapUiSettings = remember {
        MapUiSettings(
            zoomControlsEnabled = false,
            myLocationButtonEnabled = false,
            compassEnabled = true
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = mapProperties,
            uiSettings = mapUiSettings
        ) {
            tastingsWithLocation.forEach { tasting ->
                val position = LatLng(tasting.locationLatitude!!, tasting.locationLongitude!!)
                val wineName = tasting.vintage?.wine?.name ?: "Wine Tasting"

                Marker(
                    state = MarkerState(position = position),
                    title = wineName,
                    snippet = tasting.locationName ?: tasting.locationCity,
                    onClick = {
                        selectedTasting = tasting
                        showTastingSheet = true
                        true
                    }
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            MapViewModeSelector(
                selectedMode = mapViewMode,
                onModeSelected = { mapViewMode = it }
            )

            Spacer(modifier = Modifier.height(8.dp))

            StatsCard(stats = stats, tastingsWithLocation = tastingsWithLocation.size)
        }

        if (tastingsWithLocation.isEmpty()) {
            EmptyMapOverlay()
        }
    }

    if (showTastingSheet && selectedTasting != null) {
        ModalBottomSheet(
            onDismissRequest = {
                showTastingSheet = false
                selectedTasting = null
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            TastingLocationCard(
                tasting = selectedTasting!!,
                onClick = {
                    showTastingSheet = false
                    onTastingClick(selectedTasting!!)
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MapViewModeSelector(
    selectedMode: MapViewMode,
    onModeSelected: (MapViewMode) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
        ),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        SingleChoiceSegmentedButtonRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            MapViewMode.entries.forEachIndexed { index, mode ->
                SegmentedButton(
                    selected = selectedMode == mode,
                    onClick = { onModeSelected(mode) },
                    shape = SegmentedButtonDefaults.itemShape(
                        index = index,
                        count = MapViewMode.entries.size
                    ),
                    icon = {
                        Icon(
                            imageVector = when (mode) {
                                MapViewMode.TASTINGS -> Icons.Rounded.WineBar
                                MapViewMode.REGIONS -> Icons.Rounded.Map
                            },
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                ) {
                    Text(
                        text = when (mode) {
                            MapViewMode.TASTINGS -> "Tastings"
                            MapViewMode.REGIONS -> "Regions"
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun StatsCard(stats: WineStats?, tastingsWithLocation: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
        ),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                value = (stats?.uniqueCountries ?: 0).toString(),
                label = "Countries"
            )
            StatItem(
                value = (stats?.uniqueRegions ?: 0).toString(),
                label = "Regions"
            )
            StatItem(
                value = tastingsWithLocation.toString(),
                label = "Locations"
            )
        }
    }
}

@Composable
private fun StatItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        )
    }
}

@Composable
private fun EmptyMapOverlay() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.padding(32.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
            ),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Rounded.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "No locations yet",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Add location info to your tastings to see them on the map",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
private fun TastingLocationCard(
    tasting: Tasting,
    onClick: () -> Unit
) {
    val wineName = tasting.vintage?.wine?.name ?: "Unknown Wine"
    val producer = tasting.vintage?.wine?.producer?.name
    val dateFormatter = DateTimeFormatter.ofPattern("MMMM d, yyyy")
    val tastedDate = tasting.tastedAt?.let {
        runCatching {
            LocalDate.parse(it.take(10)).format(dateFormatter)
        }.getOrNull()
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = wineName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                producer?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                    )
                }
            }

            tasting.verdict?.let { verdict ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Star,
                        contentDescription = null,
                        tint = Color(0xFFFFC107),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = verdict.toString(),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        tasting.locationName?.let { location ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Rounded.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = location,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    tasting.locationCity?.let { city ->
                        Text(
                            text = city,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }

        tastedDate?.let { date ->
            Text(
                text = "Tasted on $date",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }

        tasting.notes?.takeIf { it.isNotBlank() }?.let { notes ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = notes,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(12.dp),
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}
