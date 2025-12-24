package com.strategicnerds.vinho

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.strategicnerds.vinho.ui.theme.VinhoBackground
import com.strategicnerds.vinho.ui.theme.VinhoError
import com.strategicnerds.vinho.ui.theme.VinhoGradientStart
import com.strategicnerds.vinho.ui.theme.VinhoGradientStop
import com.strategicnerds.vinho.ui.theme.VinhoOnBackground
import com.strategicnerds.vinho.ui.theme.VinhoOnSurface
import com.strategicnerds.vinho.ui.theme.VinhoPrimary
import com.strategicnerds.vinho.ui.theme.VinhoSecondary
import com.strategicnerds.vinho.ui.theme.VinhoSurface
import com.strategicnerds.vinho.ui.theme.VinhoTypography

val VinhoGradient = Brush.linearGradient(
    colors = listOf(VinhoGradientStart, VinhoGradientStop)
)

private val vinhoColorScheme = darkColorScheme(
    primary = VinhoPrimary,
    secondary = VinhoSecondary,
    background = VinhoBackground,
    surface = VinhoSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = VinhoOnBackground,
    onSurface = VinhoOnSurface,
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
