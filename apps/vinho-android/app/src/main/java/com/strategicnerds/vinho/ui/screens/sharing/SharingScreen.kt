package com.strategicnerds.vinho.ui.screens.sharing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.text.KeyboardOptions
import com.strategicnerds.vinho.ui.state.SharingViewModel

@Composable
fun SharingScreen(
    userId: String,
    onDismiss: () -> Unit,
    viewModel: SharingViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var email by remember { mutableStateOf("") }

    LaunchedEffect(userId) { if (userId.isNotBlank()) viewModel.load(userId) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Sharing", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Invite people to view your tastings, and choose whose tastings appear in your journal.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // Invite
        Text("Invite someone", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email address") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = { viewModel.sendInvitation(email); email = "" },
            enabled = !state.sending && email.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (state.sending) "Sending…" else "Send invitation") }
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Divider()

        if (state.loading) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                CircularProgressIndicator()
            }
        } else {
            // Pending invitations received
            if (state.pendingReceived.isNotEmpty()) {
                Text("Pending invitations", style = MaterialTheme.typography.titleMedium)
                state.pendingReceived.forEach { c ->
                    ConnectionCard(name = c.sharerProfile?.displayName ?: "Someone") {
                        OutlinedButton(onClick = { viewModel.reject(c.id) }) { Text("Decline") }
                        Button(onClick = { viewModel.accept(c.id) }) { Text("Accept") }
                    }
                }
            }

            // Active shares I've sent
            if (state.activeSharesSent.isNotEmpty()) {
                Text("Sharing with", style = MaterialTheme.typography.titleMedium)
                state.activeSharesSent.forEach { c ->
                    ConnectionCard(name = c.viewerProfile?.displayName ?: "Viewer") {
                        OutlinedButton(onClick = { viewModel.revoke(c.id) }) { Text("Revoke") }
                    }
                }
            }

            // Active shares I've received, with a visibility toggle
            if (state.activeSharesReceived.isNotEmpty()) {
                Text("Viewing tastings from", style = MaterialTheme.typography.titleMedium)
                state.activeSharesReceived.forEach { c ->
                    ConnectionCard(name = c.sharerProfile?.displayName ?: "Sharer") {
                        Switch(
                            checked = state.isSharerVisible(c.sharerId),
                            onCheckedChange = { viewModel.toggleVisibility(c.sharerId, it) },
                        )
                    }
                }
            }

            if (state.pendingReceived.isEmpty() &&
                state.activeSharesSent.isEmpty() &&
                state.activeSharesReceived.isEmpty()
            ) {
                Text(
                    "No sharing connections yet. Invite someone above to get started.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) { Text("Done") }
    }
}

@Composable
private fun ConnectionCard(name: String, actions: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            actions()
        }
    }
}
