package com.strategicnerds.vinho.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.strategicnerds.vinho.ui.state.ProfileViewModel

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WinePreferencesScreen(
    userId: String,
    onDismiss: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var customRegion by remember { mutableStateOf("") }

    LaunchedEffect(userId) {
        if (state.profile?.id != userId) viewModel.loadProfile(userId)
    }
    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) {
            viewModel.resetSaveSuccess()
            onDismiss()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Wine Preferences", style = MaterialTheme.typography.headlineSmall)

        PreferenceSection("Wine Types") {
            PreferenceChips(WinePreferenceOptions.wineTypes, state.selectedWineTypes) {
                viewModel.toggleWineType(it)
            }
        }

        PreferenceSection("Favorite Regions") {
            PreferenceChips(WinePreferenceOptions.regions, state.selectedRegions) {
                viewModel.toggleRegion(it)
            }
            OutlinedTextField(
                value = customRegion,
                onValueChange = { customRegion = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Add custom region") },
                trailingIcon = {
                    OutlinedButton(onClick = {
                        viewModel.addRegion(customRegion)
                        customRegion = ""
                    }) { Text("Add") }
                }
            )
        }

        PreferenceSection("Favorite Varietals") {
            PreferenceChips(WinePreferenceOptions.varietals, state.selectedVarietals) {
                viewModel.toggleVarietal(it)
            }
        }

        PreferenceSection("Favorite Styles") {
            PreferenceChips(WinePreferenceOptions.styles, state.selectedStyles) {
                viewModel.toggleStyle(it)
            }
        }

        PreferenceSection("Price Range (USD)") {
            Text("$${state.minimumPrice} to $${state.maximumPrice}")
            RangeSlider(
                value = state.minimumPrice.toFloat()..state.maximumPrice.toFloat(),
                onValueChange = {
                    viewModel.setPriceRange(it.start.toInt(), it.endInclusive.toInt())
                },
                valueRange = 0f..500f,
                steps = 49
            )
        }

        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Button(
            onClick = { viewModel.saveProfile(userId) },
            enabled = !state.isSaving,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (state.isSaving) "Saving…" else "Save Preferences")
        }
        OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
            Text("Cancel")
        }
    }
}

@Composable
private fun PreferenceSection(title: String, content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(title, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PreferenceChips(
    options: List<String>,
    selected: Set<String>,
    onToggle: (String) -> Unit
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { option ->
            FilterChip(
                selected = option in selected,
                onClick = { onToggle(option) },
                label = { Text(option) }
            )
        }
    }
}
