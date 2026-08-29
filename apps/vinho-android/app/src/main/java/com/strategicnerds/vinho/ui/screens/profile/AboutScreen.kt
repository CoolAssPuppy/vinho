package com.strategicnerds.vinho.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.strategicnerds.vinho.BuildConfig

@Composable
fun AboutScreen(onDismiss: () -> Unit) {
    val uriHandler = LocalUriHandler.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Vinho", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
        Text(
            "Your personal wine companion for label scanning, tasting notes, maps, and " +
                "recommendations based on your own journal."
        )
        Text("Built in Lisbon by Strategic Nerds.")
        OutlinedButton(
            onClick = { uriHandler.openUri("https://www.vinho.dev") },
            modifier = Modifier.fillMaxWidth()
        ) { Text("vinho.dev") }
        OutlinedButton(
            onClick = { uriHandler.openUri("mailto:hello@strategicnerds.com") },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Contact Support") }
        OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
            Text("Done")
        }
    }
}
