package com.strategicnerds.vinho.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp

@Composable
fun VivinoImportScreen(onDismiss: () -> Unit) {
    val uriHandler = LocalUriHandler.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Import from Vivino", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Vinho can import your Vivino export on the web. Export your data from Vivino, " +
                "then open your Vinho profile and choose Import from Vivino."
        )
        Button(
            onClick = { uriHandler.openUri("https://www.vinho.dev/profile") },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Open Vinho Import") }
        OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
            Text("Done")
        }
    }
}
