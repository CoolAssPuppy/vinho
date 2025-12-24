package com.strategicnerds.vinho.ui.components

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.strategicnerds.vinho.VinhoGradient
import com.strategicnerds.vinho.ui.theme.VinhoTypography

@Composable
fun VinhoLogo(
    text: String = "Vinho",
    gradient: Brush = VinhoGradient,
) {
    Text(
        text = text,
        style = VinhoTypography.displayLarge.copy(
            brush = gradient,
            fontWeight = FontWeight.Bold,
            fontSize = 34.sp
        ),
        color = Color.Unspecified,
        textAlign = TextAlign.Center
    )
}
