package com.strategicnerds.vinho.ui.screens.profile

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.strategicnerds.vinho.ui.state.DataExportViewModel
import java.io.File
import java.time.LocalDate

@Composable
fun DataExportScreen(
    onDismiss: () -> Unit,
    viewModel: DataExportViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(state.json) {
        state.json?.let {
            shareExport(context, it)
            viewModel.consumeExport()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Download My Data", style = MaterialTheme.typography.headlineSmall)
        Text("Create a JSON file with your profile, tastings, scans, photos, and sharing settings.")
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = viewModel::export,
            enabled = !state.isExporting,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (state.isExporting) CircularProgressIndicator()
            else Text("Create Export")
        }
        OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
            Text("Done")
        }
    }
}

private fun shareExport(context: Context, json: String) {
    val exportDirectory = File(context.cacheDir, "exports").apply { mkdirs() }
    val exportFile = File(exportDirectory, "vinho-data-${LocalDate.now()}.json")
    exportFile.writeText(json)
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", exportFile)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/json"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Save Vinho data"))
}
