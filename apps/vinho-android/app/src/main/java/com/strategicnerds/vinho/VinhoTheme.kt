package com.strategicnerds.vinho

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.strategicnerds.vinho.ui.theme.VinhoBackground
import com.strategicnerds.vinho.ui.theme.VinhoBorder
import com.strategicnerds.vinho.ui.theme.VinhoElevatedSurface
import com.strategicnerds.vinho.ui.theme.VinhoError
import com.strategicnerds.vinho.ui.theme.VinhoMuted
import com.strategicnerds.vinho.ui.theme.VinhoOnBackground
import com.strategicnerds.vinho.ui.theme.VinhoOnSurface
import com.strategicnerds.vinho.ui.theme.VinhoPrimary
import com.strategicnerds.vinho.ui.theme.VinhoSecondary
import com.strategicnerds.vinho.ui.theme.VinhoSurface
import com.strategicnerds.vinho.ui.theme.VinhoTypography

private val vinhoColorScheme = darkColorScheme(
    primary = VinhoPrimary,
    primaryContainer = VinhoPrimary,
    secondary = VinhoSecondary,
    secondaryContainer = VinhoElevatedSurface,
    background = VinhoBackground,
    surface = VinhoSurface,
    surfaceVariant = VinhoElevatedSurface,
    onPrimary = Color.White,
    onPrimaryContainer = Color.White,
    onSecondary = VinhoBackground,
    onSecondaryContainer = VinhoOnSurface,
    onBackground = VinhoOnBackground,
    onSurface = VinhoOnSurface,
    onSurfaceVariant = VinhoMuted,
    outline = VinhoBorder,
    error = VinhoError
)

@Composable
fun VinhoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = vinhoColorScheme,
        typography = VinhoTypography,
        content = content
    )
}
