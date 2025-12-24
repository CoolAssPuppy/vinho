package com.strategicnerds.vinho.ui.screens.journal

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.strategicnerds.vinho.VinhoGradient
import com.strategicnerds.vinho.core.places.GooglePlacesService
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.model.TastingLocation
import com.strategicnerds.vinho.ui.components.PlaceAutocompleteField
import com.strategicnerds.vinho.ui.state.TastingEditorViewModel
import com.strategicnerds.vinho.ui.state.TastingStyle
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TastingEditorScreen(
    existingTasting: Tasting? = null,
    userId: String,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
    placesService: GooglePlacesService,
    viewModel: TastingEditorViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(existingTasting) {
        if (existingTasting != null) {
            viewModel.loadExistingTasting(existingTasting)
        }
    }

    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) {
            onSaved()
            viewModel.resetState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (existingTasting != null) "Edit Tasting" else "New Tasting",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            WineInfoCard(tasting = existingTasting, vintage = state.vintage)

            TastingStyleSelector(
                selectedStyle = state.tastingStyle,
                onStyleSelected = viewModel::setTastingStyle
            )

            when (state.tastingStyle) {
                TastingStyle.CASUAL -> CasualTastingForm(
                    verdict = state.verdict,
                    onVerdictChange = viewModel::setVerdict,
                    tastedAt = state.tastedAt,
                    onDateClick = { showDatePicker = true },
                    locationName = state.locationName,
                    onLocationChange = { name -> viewModel.setLocation(name) },
                    onPlaceSelected = { place ->
                        if (place != null) {
                            viewModel.setLocation(
                                name = place.name,
                                address = place.address,
                                city = place.city ?: "",
                                latitude = place.latitude,
                                longitude = place.longitude
                            )
                        } else {
                            viewModel.setLocation("")
                        }
                    },
                    placesService = placesService
                )

                TastingStyle.SOMMELIER -> SommelierTastingForm(
                    verdict = state.verdict,
                    onVerdictChange = viewModel::setVerdict,
                    notes = state.notes,
                    onNotesChange = viewModel::setNotes,
                    tastedAt = state.tastedAt,
                    onDateClick = { showDatePicker = true },
                    locationName = state.locationName,
                    onLocationChange = { name -> viewModel.setLocation(name) },
                    onPlaceSelected = { place ->
                        if (place != null) {
                            viewModel.setLocation(
                                name = place.name,
                                address = place.address,
                                city = place.city ?: "",
                                latitude = place.latitude,
                                longitude = place.longitude
                            )
                        } else {
                            viewModel.setLocation("")
                        }
                    },
                    placesService = placesService
                )

                TastingStyle.WINEMAKER -> WinemakerTastingForm(
                    verdict = state.verdict,
                    onVerdictChange = viewModel::setVerdict,
                    notes = state.notes,
                    onNotesChange = viewModel::setNotes,
                    detailedNotes = state.detailedNotes,
                    onDetailedNotesChange = viewModel::setDetailedNotes,
                    tastedAt = state.tastedAt,
                    onDateClick = { showDatePicker = true },
                    locationName = state.locationName,
                    onLocationChange = { name -> viewModel.setLocation(name) },
                    onPlaceSelected = { place ->
                        if (place != null) {
                            viewModel.setLocation(
                                name = place.name,
                                address = place.address,
                                city = place.city ?: "",
                                latitude = place.latitude,
                                longitude = place.longitude
                            )
                        } else {
                            viewModel.setLocation("")
                        }
                    },
                    placesService = placesService
                )
            }

            state.error?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { viewModel.saveTasting(userId) },
                enabled = !state.isSaving,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                if (state.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(
                        text = "Save Tasting",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }

    if (showDatePicker) {
        TastingDatePicker(
            selectedDate = state.tastedAt,
            onDateSelected = { date ->
                viewModel.setTastedAt(date)
                showDatePicker = false
            },
            onDismiss = { showDatePicker = false }
        )
    }
}

@Composable
private fun WineInfoCard(tasting: Tasting?, vintage: com.strategicnerds.vinho.data.model.Vintage?) {
    val wine = vintage?.wine ?: tasting?.vintage?.wine
    val producer = wine?.producer

    if (wine != null) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            ),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = wine.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                producer?.let {
                    Text(
                        text = it.name,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                    )
                }
                vintage?.year?.let { year ->
                    Text(
                        text = year.toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TastingStyleSelector(
    selectedStyle: TastingStyle,
    onStyleSelected: (TastingStyle) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Tasting Style",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            TastingStyle.entries.forEachIndexed { index, style ->
                SegmentedButton(
                    selected = selectedStyle == style,
                    onClick = { onStyleSelected(style) },
                    shape = SegmentedButtonDefaults.itemShape(
                        index = index,
                        count = TastingStyle.entries.size
                    )
                ) {
                    Text(
                        text = when (style) {
                            TastingStyle.CASUAL -> "Casual"
                            TastingStyle.SOMMELIER -> "Sommelier"
                            TastingStyle.WINEMAKER -> "Winemaker"
                        }
                    )
                }
            }
        }

        Text(
            text = when (selectedStyle) {
                TastingStyle.CASUAL -> "Quick rating - just rate and go"
                TastingStyle.SOMMELIER -> "Add tasting notes and impressions"
                TastingStyle.WINEMAKER -> "Detailed technical analysis"
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
    }
}

@Composable
private fun StarRating(
    verdict: Int,
    onVerdictChange: (Int) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Rating",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            (1..5).forEach { star ->
                Icon(
                    imageVector = if (star <= verdict) Icons.Rounded.Star else Icons.Rounded.StarBorder,
                    contentDescription = "$star stars",
                    tint = if (star <= verdict) Color(0xFFFFC107) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier
                        .size(40.dp)
                        .clickable { onVerdictChange(star) }
                )
            }
        }
    }
}

@Composable
private fun DateField(
    tastedAt: LocalDate,
    onDateClick: () -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("MMMM d, yyyy")

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Date Tasted",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onDateClick() },
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Rounded.CalendarMonth,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = tastedAt.format(dateFormatter),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

@Composable
private fun CasualTastingForm(
    verdict: Int,
    onVerdictChange: (Int) -> Unit,
    tastedAt: LocalDate,
    onDateClick: () -> Unit,
    locationName: String,
    onLocationChange: (String) -> Unit,
    onPlaceSelected: (TastingLocation?) -> Unit,
    placesService: GooglePlacesService
) {
    var selectedPlace by remember { mutableStateOf<TastingLocation?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StarRating(verdict = verdict, onVerdictChange = onVerdictChange)
        DateField(tastedAt = tastedAt, onDateClick = onDateClick)
        PlaceAutocompleteField(
            text = locationName,
            onTextChange = onLocationChange,
            selectedPlace = selectedPlace,
            onPlaceSelected = { place ->
                selectedPlace = place
                onPlaceSelected(place)
            },
            placesService = placesService,
            placeholder = "Where did you taste this wine?"
        )
    }
}

@Composable
private fun SommelierTastingForm(
    verdict: Int,
    onVerdictChange: (Int) -> Unit,
    notes: String,
    onNotesChange: (String) -> Unit,
    tastedAt: LocalDate,
    onDateClick: () -> Unit,
    locationName: String,
    onLocationChange: (String) -> Unit,
    onPlaceSelected: (TastingLocation?) -> Unit,
    placesService: GooglePlacesService
) {
    var selectedPlace by remember { mutableStateOf<TastingLocation?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StarRating(verdict = verdict, onVerdictChange = onVerdictChange)

        OutlinedTextField(
            value = notes,
            onValueChange = onNotesChange,
            label = { Text("Tasting Notes") },
            placeholder = { Text("Describe the wine's aromas, flavors, and your impressions...") },
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp),
            shape = RoundedCornerShape(12.dp),
            maxLines = 6
        )

        DateField(tastedAt = tastedAt, onDateClick = onDateClick)
        PlaceAutocompleteField(
            text = locationName,
            onTextChange = onLocationChange,
            selectedPlace = selectedPlace,
            onPlaceSelected = { place ->
                selectedPlace = place
                onPlaceSelected(place)
            },
            placesService = placesService,
            placeholder = "Where did you taste this wine?"
        )
    }
}

@Composable
private fun WinemakerTastingForm(
    verdict: Int,
    onVerdictChange: (Int) -> Unit,
    notes: String,
    onNotesChange: (String) -> Unit,
    detailedNotes: String,
    onDetailedNotesChange: (String) -> Unit,
    tastedAt: LocalDate,
    onDateClick: () -> Unit,
    locationName: String,
    onLocationChange: (String) -> Unit,
    onPlaceSelected: (TastingLocation?) -> Unit,
    placesService: GooglePlacesService
) {
    var selectedPlace by remember { mutableStateOf<TastingLocation?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StarRating(verdict = verdict, onVerdictChange = onVerdictChange)

        OutlinedTextField(
            value = notes,
            onValueChange = onNotesChange,
            label = { Text("Tasting Notes") },
            placeholder = { Text("Aromas, flavors, body, finish...") },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            shape = RoundedCornerShape(12.dp),
            maxLines = 5
        )

        OutlinedTextField(
            value = detailedNotes,
            onValueChange = onDetailedNotesChange,
            label = { Text("Technical Analysis") },
            placeholder = { Text("Acidity, tannins, oak influence, aging potential, food pairings...") },
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp),
            shape = RoundedCornerShape(12.dp),
            maxLines = 7
        )

        DateField(tastedAt = tastedAt, onDateClick = onDateClick)
        PlaceAutocompleteField(
            text = locationName,
            onTextChange = onLocationChange,
            selectedPlace = selectedPlace,
            onPlaceSelected = { place ->
                selectedPlace = place
                onPlaceSelected(place)
            },
            placesService = placesService,
            placeholder = "Where did you taste this wine?"
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TastingDatePicker(
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
    onDismiss: () -> Unit
) {
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = selectedDate
            .atStartOfDay(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli()
    )

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val date = Instant.ofEpochMilli(millis)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate()
                        onDateSelected(date)
                    }
                }
            ) {
                Text("OK")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    ) {
        DatePicker(state = datePickerState)
    }
}
