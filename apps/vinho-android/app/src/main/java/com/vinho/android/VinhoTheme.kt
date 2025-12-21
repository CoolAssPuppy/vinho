package com.vinho.android

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.vinho.android.ui.theme.VinhoBackground
import com.vinho.android.ui.theme.VinhoError
import com.vinho.android.ui.theme.VinhoGradientStart
import com.vinho.android.ui.theme.VinhoGradientStop
import com.vinho.android.ui.theme.VinhoOnBackground
import com.vinho.android.ui.theme.VinhoOnSurface
import com.vinho.android.ui.theme.VinhoPrimary
import com.vinho.android.ui.theme.VinhoSecondary
import com.vinho.android.ui.theme.VinhoSurface
import com.vinho.android.ui.theme.VinhoTypography

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
