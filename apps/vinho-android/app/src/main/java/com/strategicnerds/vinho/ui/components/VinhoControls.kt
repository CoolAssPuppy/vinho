package com.strategicnerds.vinho.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.strategicnerds.vinho.ui.theme.VinhoBorder
import com.strategicnerds.vinho.ui.theme.VinhoElevatedSurface
import com.strategicnerds.vinho.ui.theme.VinhoMuted
import com.strategicnerds.vinho.ui.theme.VinhoOnSurface
import com.strategicnerds.vinho.ui.theme.VinhoPrimary
import com.strategicnerds.vinho.ui.theme.VinhoSecondary
import com.strategicnerds.vinho.ui.theme.VinhoSurface

private val controlShape = RoundedCornerShape(14.dp)
private val cardShape = RoundedCornerShape(24.dp)
private val wineGradient = Brush.linearGradient(
    listOf(Color(0xFFD05A55), VinhoPrimary, Color(0xFF7B292C))
)

@Composable
fun VinhoPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    leadingIcon: ImageVector? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = 56.dp)
            .shadow(if (enabled) 14.dp else 0.dp, controlShape, ambientColor = VinhoPrimary.copy(alpha = 0.35f))
            .clip(controlShape)
            .background(if (enabled) wineGradient else Brush.linearGradient(listOf(VinhoMuted, VinhoMuted)))
            .clickable(
                enabled = enabled && !isLoading,
                role = Role.Button,
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            leadingIcon?.let {
                Icon(it, contentDescription = null, tint = Color.White, modifier = Modifier.padding(end = 8.dp))
            }
            Text(text, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun VinhoSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    isDestructive: Boolean = false
) {
    val tint = if (isDestructive) MaterialTheme.colorScheme.error else VinhoSecondary
    Row(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = 52.dp)
            .clip(controlShape)
            .background(if (isDestructive) MaterialTheme.colorScheme.error.copy(alpha = 0.1f) else VinhoElevatedSurface)
            .border(1.dp, tint.copy(alpha = 0.3f), controlShape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        leadingIcon?.let { Icon(it, contentDescription = null, tint = tint, modifier = Modifier.padding(end = 8.dp)) }
        Text(text, color = tint, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun VinhoTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "",
    placeholder: String = "",
    leadingIcon: ImageVector? = null,
    trailingContent: (@Composable () -> Unit)? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        if (label.isNotEmpty()) {
            Text(label, style = MaterialTheme.typography.labelLarge, color = VinhoOnSurface, fontWeight = FontWeight.SemiBold)
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = singleLine,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            textStyle = textStyle.copy(color = VinhoOnSurface),
            cursorBrush = SolidColor(VinhoSecondary),
            modifier = Modifier.fillMaxWidth(),
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = 54.dp)
                        .clip(controlShape)
                        .background(VinhoElevatedSurface)
                        .border(BorderStroke(1.dp, VinhoBorder), controlShape)
                        .padding(horizontal = 15.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    leadingIcon?.let { Icon(it, contentDescription = null, tint = VinhoSecondary, modifier = Modifier.size(20.dp)) }
                    Box(modifier = Modifier.weight(1f)) {
                        if (value.isEmpty() && placeholder.isNotEmpty()) {
                            Text(placeholder, style = textStyle, color = VinhoMuted)
                        }
                        innerTextField()
                    }
                    trailingContent?.invoke()
                }
            }
        )
    }
}

@Composable
fun VinhoGlassCard(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(18.dp),
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .shadow(14.dp, cardShape, ambientColor = Color.Black.copy(alpha = 0.32f))
            .clip(cardShape)
            .background(Brush.linearGradient(listOf(VinhoElevatedSurface, VinhoSurface)))
            .border(1.dp, Color.White.copy(alpha = 0.08f), cardShape)
            .padding(contentPadding),
        content = content
    )
}

@Composable
fun VinhoNavigationDock(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .shadow(22.dp, RoundedCornerShape(30.dp), ambientColor = Color.Black.copy(alpha = 0.5f))
            .clip(RoundedCornerShape(30.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF302B2C), VinhoSurface)))
            .border(1.dp, VinhoSecondary.copy(alpha = 0.18f), RoundedCornerShape(30.dp))
            .padding(horizontal = 24.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content
    )
}

@Composable
fun VinhoSegmentedControl(
    options: List<String>,
    selectedIndex: Int,
    onSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
    icons: List<ImageVector> = emptyList()
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(VinhoSurface)
            .border(1.dp, VinhoBorder, RoundedCornerShape(18.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        options.forEachIndexed { index, option ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (index == selectedIndex) wineGradient else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)))
                    .clickable(role = Role.Tab) { onSelected(index) }
                    .padding(vertical = 9.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                icons.getOrNull(index)?.let {
                    Icon(
                        it,
                        contentDescription = null,
                        tint = if (index == selectedIndex) Color.White else VinhoMuted,
                        modifier = Modifier.size(17.dp)
                    )
                }
                Text(
                    option,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (index == selectedIndex) Color.White else VinhoMuted,
                    fontWeight = if (index == selectedIndex) FontWeight.SemiBold else FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun VinhoDialog(
    title: String,
    onDismiss: () -> Unit,
    confirmText: String,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
    dismissText: String = "Cancel",
    confirmEnabled: Boolean = true,
    content: @Composable () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        VinhoGlassCard(modifier = modifier.fillMaxWidth(), contentPadding = PaddingValues(22.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = VinhoOnSurface)
                content()
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier.weight(1f).clip(controlShape).clickable(role = Role.Button, onClick = onDismiss).padding(14.dp),
                        contentAlignment = Alignment.Center
                    ) { Text(dismissText, color = VinhoSecondary, fontWeight = FontWeight.SemiBold) }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(controlShape)
                            .background(if (confirmEnabled) wineGradient else Brush.linearGradient(listOf(VinhoMuted, VinhoMuted)))
                            .clickable(enabled = confirmEnabled, role = Role.Button, onClick = onConfirm)
                            .padding(14.dp),
                        contentAlignment = Alignment.Center
                    ) { Text(confirmText, color = Color.White, fontWeight = FontWeight.SemiBold) }
                }
            }
        }
    }
}
