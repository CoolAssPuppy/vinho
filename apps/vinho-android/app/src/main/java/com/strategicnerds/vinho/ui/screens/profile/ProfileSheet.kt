package com.strategicnerds.vinho.ui.screens.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Gavel
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PrivacyTip
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.strategicnerds.vinho.ui.state.SessionUiState

@Composable
fun ProfileSheet(
    sessionState: SessionUiState,
    onSignOut: () -> Unit,
    onDeleteAccount: () -> Unit,
    onToggleBiometrics: (Boolean) -> Unit,
    onEditProfile: () -> Unit = {}
) {
    val context = LocalContext.current

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ProfileHeader(
                sessionState = sessionState,
                onEditClick = onEditProfile
            )

            SettingsSection(
                biometricsEnabled = sessionState.preferences.biometricsEnabled,
                onToggleBiometrics = onToggleBiometrics,
                onRateApp = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.strategicnerds.vinho"))
                    context.startActivity(intent)
                },
                onTerms = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.strategicnerds.com/terms"))
                    context.startActivity(intent)
                },
                onPrivacy = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.strategicnerds.com/privacy"))
                    context.startActivity(intent)
                }
            )

            ActionButtons(
                onSignOut = onSignOut,
                onDeleteAccount = onDeleteAccount
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ProfileHeader(
    sessionState: SessionUiState,
    onEditClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val avatarUrl = sessionState.userProfile?.avatarUrl
                val initial = sessionState.userProfile?.fullName?.firstOrNull()?.uppercase()
                    ?: sessionState.userProfile?.email?.firstOrNull()?.uppercase() ?: "V"

                if (avatarUrl != null) {
                    AsyncImage(
                        model = avatarUrl,
                        contentDescription = "Profile avatar",
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFFFF7B4D),
                                        Color(0xFFB24DC7)
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = initial.toString(),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = sessionState.userProfile?.fullName.ifNullOrBlank { "Wine Lover" },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = sessionState.userProfile?.email.orEmpty(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    sessionState.userProfile?.description?.takeIf { it.isNotBlank() }?.let { bio ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = bio,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            maxLines = 2
                        )
                    }
                }
            }

            Button(
                onClick = onEditClick,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Rounded.Edit, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Edit Profile")
            }
        }
    }
}

@Composable
private fun SettingsSection(
    biometricsEnabled: Boolean,
    onToggleBiometrics: (Boolean) -> Unit,
    onRateApp: () -> Unit = {},
    onTerms: () -> Unit = {},
    onPrivacy: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column {
            SettingsRow(
                icon = Icons.Rounded.Fingerprint,
                title = "Biometric Lock",
                subtitle = "Require biometrics when returning to the app",
                trailing = {
                    Switch(
                        checked = biometricsEnabled,
                        onCheckedChange = onToggleBiometrics
                    )
                }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            SettingsRow(
                icon = Icons.Rounded.Notifications,
                title = "Notifications",
                subtitle = "Manage push notification preferences",
                trailing = {
                    Icon(
                        Icons.Rounded.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onClick = { }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            SettingsRow(
                icon = Icons.Rounded.Share,
                title = "Sharing",
                subtitle = "Manage who can see your tastings",
                trailing = {
                    Icon(
                        Icons.Rounded.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onClick = { }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            SettingsRow(
                icon = Icons.Rounded.Star,
                title = "Rate App",
                subtitle = "Share your feedback on the Play Store",
                trailing = {
                    Icon(
                        Icons.Rounded.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onClick = onRateApp
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            SettingsRow(
                icon = Icons.Rounded.Gavel,
                title = "Terms of Service",
                subtitle = "Read our terms and conditions",
                trailing = {
                    Icon(
                        Icons.Rounded.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onClick = onTerms
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            SettingsRow(
                icon = Icons.Rounded.PrivacyTip,
                title = "Privacy Policy",
                subtitle = "Read our privacy policy",
                trailing = {
                    Icon(
                        Icons.Rounded.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onClick = onPrivacy
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            SettingsRow(
                icon = Icons.Rounded.Info,
                title = "About",
                subtitle = "Version 1.0.0",
                trailing = {
                    Icon(
                        Icons.Rounded.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                onClick = { }
            )
        }
    }
}

@Composable
private fun SettingsRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    trailing: @Composable () -> Unit,
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
        trailing()
    }
}

@Composable
private fun ActionButtons(
    onSignOut: () -> Unit,
    onDeleteAccount: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Button(
            onClick = onSignOut,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurface
            )
        ) {
            Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign Out", fontWeight = FontWeight.Medium)
        }

        Button(
            onClick = onDeleteAccount,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.1f),
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(Icons.Rounded.Delete, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Delete Account", fontWeight = FontWeight.Medium)
        }
    }
}

private inline fun String?.ifNullOrBlank(defaultValue: () -> String): String =
    if (this.isNullOrBlank()) defaultValue() else this
