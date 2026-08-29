package com.strategicnerds.vinho.ui.components

import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import com.strategicnerds.vinho.R

@Composable
fun VinhoMark(
    contentDescription: String?,
    modifier: Modifier = Modifier,
    tint: Color = Color.Unspecified,
) {
    Icon(
        painter = painterResource(R.drawable.ic_launcher_foreground),
        contentDescription = contentDescription,
        modifier = modifier,
        tint = tint,
    )
}
