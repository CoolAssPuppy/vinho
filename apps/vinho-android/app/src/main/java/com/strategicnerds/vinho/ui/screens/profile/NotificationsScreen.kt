package com.strategicnerds.vinho.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.strategicnerds.vinho.core.preferences.NotificationToggle
import com.strategicnerds.vinho.ui.state.NotificationsViewModel

@Composable
fun NotificationsScreen(
    onDismiss: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel()
) {
    val prefs by viewModel.notifications.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text("Notifications", style = MaterialTheme.typography.headlineSmall)

        Text(
            "Push notifications",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
        )
        ToggleRow("Push notifications", prefs.push) {
            viewModel.setToggle(NotificationToggle.PUSH, it)
        }
        ToggleRow("Tasting reminders", prefs.tastingReminders) {
            viewModel.setToggle(NotificationToggle.TASTING_REMINDERS, it)
        }
        ToggleRow("New wine alerts", prefs.newWineAlerts) {
            viewModel.setToggle(NotificationToggle.NEW_WINE_ALERTS, it)
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

        Text(
            "Email notifications",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 4.dp)
        )
        ToggleRow("Email notifications", prefs.email) {
            viewModel.setToggle(NotificationToggle.EMAIL, it)
        }
        ToggleRow("Price alerts", prefs.priceAlerts) {
            viewModel.setToggle(NotificationToggle.PRICE_ALERTS, it)
        }
        ToggleRow("Event notifications", prefs.events) {
            viewModel.setToggle(NotificationToggle.EVENTS, it)
        }

        OutlinedButton(
            onClick = onDismiss,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 20.dp)
        ) { Text("Done") }
    }
}

@Composable
private fun ToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
