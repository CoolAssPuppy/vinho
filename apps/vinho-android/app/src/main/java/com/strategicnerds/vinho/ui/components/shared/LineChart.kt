package com.strategicnerds.vinho.ui.components.shared

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class ChartDataPoint(
    val value: Double,
    val label: String? = null
)

data class ChartLine(
    val dataPoints: List<ChartDataPoint>,
    val color: Color,
    val label: String
)

data class GoalLine(
    val value: Double,
    val color: Color,
    val label: String
)

@Composable
fun LineChart(
    lines: List<ChartLine>,
    modifier: Modifier = Modifier,
    title: String? = null,
    subtitle: String? = null,
    goalLine: GoalLine? = null,
    chartHeight: Dp = 150.dp,
    emptyMessage: String = "No data yet",
    showLegend: Boolean = true,
    minValue: Double? = null,
    maxValue: Double? = null
) {
    val allValues = lines.flatMap { it.dataPoints.map { dp -> dp.value } }
    val hasData = allValues.isNotEmpty()

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (title != null) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (title != null || subtitle != null) {
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (!hasData) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(chartHeight),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        emptyMessage,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                val computedMin = minValue ?: (goalLine?.value?.let { minOf(it, allValues.min()) } ?: allValues.min()) - 2
                val computedMax = maxValue ?: allValues.max() + 2
                val range = computedMax - computedMin

                Canvas(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(chartHeight)
                ) {
                    val width = size.width
                    val height = size.height
                    val padding = 8.dp.toPx()

                    // Draw goal line if present
                    goalLine?.let { goal ->
                        val goalY = height - ((goal.value - computedMin) / range * (height - padding * 2)).toFloat() - padding
                        drawLine(
                            color = goal.color.copy(alpha = 0.5f),
                            start = Offset(0f, goalY),
                            end = Offset(width, goalY),
                            strokeWidth = 2.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
                        )
                    }

                    // Draw each line
                    lines.forEach { line ->
                        if (line.dataPoints.size > 1) {
                            val path = Path()
                            line.dataPoints.forEachIndexed { index, dataPoint ->
                                val x = (index.toFloat() / (line.dataPoints.size - 1)) * (width - padding * 2) + padding
                                val y = height - ((dataPoint.value - computedMin) / range * (height - padding * 2)).toFloat() - padding

                                if (index == 0) {
                                    path.moveTo(x, y)
                                } else {
                                    path.lineTo(x, y)
                                }
                            }

                            drawPath(
                                path = path,
                                color = line.color,
                                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                            )

                            // Draw dots
                            line.dataPoints.forEachIndexed { index, dataPoint ->
                                val x = (index.toFloat() / (line.dataPoints.size - 1)) * (width - padding * 2) + padding
                                val y = height - ((dataPoint.value - computedMin) / range * (height - padding * 2)).toFloat() - padding

                                drawCircle(
                                    color = line.color,
                                    radius = 4.dp.toPx(),
                                    center = Offset(x, y)
                                )
                            }
                        }
                    }
                }

                if (showLegend) {
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        lines.forEach { line ->
                            LegendItem(color = line.color, label = line.label)
                        }
                        goalLine?.let { goal ->
                            LegendItem(color = goal.color, label = goal.label)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LegendItem(
    color: Color,
    label: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .height(3.dp)
                .background(color)
                .padding(horizontal = 8.dp)
        )
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
