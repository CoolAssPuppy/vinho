package com.strategicnerds.vinho.ui.components

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.strategicnerds.vinho.ui.theme.VinhoPrimary
import com.strategicnerds.vinho.ui.theme.VinhoTypography

@Composable
fun VinhoLogo(
    text: String = "Vinho",
) {
    Text(
        text = text,
        style = VinhoTypography.titleMedium.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp
        ),
        color = VinhoPrimary,
        textAlign = TextAlign.Center
    )
}
