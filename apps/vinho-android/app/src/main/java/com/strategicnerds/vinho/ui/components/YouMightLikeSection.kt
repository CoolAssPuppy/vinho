package com.strategicnerds.vinho.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.WineBar
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.strategicnerds.vinho.core.recommendations.SimilarWinesResult
import com.strategicnerds.vinho.core.recommendations.VisualSimilarityService
import com.strategicnerds.vinho.data.model.RecommendationType
import com.strategicnerds.vinho.data.model.SimilarWine
import kotlinx.coroutines.launch

@Composable
fun YouMightLikeSection(
    hasTastings: Boolean,
    similarityService: VisualSimilarityService,
    onWineClick: (SimilarWine) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var wines by remember { mutableStateOf<List<SimilarWine>>(emptyList()) }
    var recommendationType by remember { mutableStateOf(RecommendationType.YOUR_FAVORITES) }
    var isLoading by remember { mutableStateOf(false) }
    var hasLoaded by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun fetchSimilarWines() {
        isLoading = true
        errorMessage = null
        try {
            val result = similarityService.fetchSimilarWines()
            wines = result.wines
            recommendationType = result.recommendationType
            hasLoaded = true
        } catch (e: Exception) {
            errorMessage = e.message ?: "Failed to load recommendations"
        }
        isLoading = false
    }

    LaunchedEffect(hasTastings) {
        if (hasTastings && !hasLoaded) {
            fetchSimilarWines()
        }
    }

    if (!hasTastings) return

    Box(modifier = modifier) {
        when {
            isLoading -> LoadingView()
            errorMessage != null -> ErrorView(
                message = errorMessage!!,
                onRetry = { scope.launch { fetchSimilarWines() } }
            )
            wines.isEmpty() && hasLoaded -> EmptyView()
            wines.isNotEmpty() -> ContentView(
                wines = wines,
                recommendationType = recommendationType,
                onRefresh = { scope.launch { fetchSimilarWines() } },
                onWineClick = onWineClick
            )
            else -> LoadingView()
        }
    }
}

@Composable
private fun LoadingView() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(32.dp),
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Finding wines you might like...",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
    }
}

@Composable
private fun ErrorView(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        Spacer(modifier = Modifier.height(12.dp))
        TextButton(onClick = onRetry) {
            Text("Retry", color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun EmptyView() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Rounded.AutoAwesome,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "No visual matches found yet",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "As you add more wines, we'll find bottles with similar labels.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
        )
    }
}

@Composable
private fun ContentView(
    wines: List<SimilarWine>,
    recommendationType: RecommendationType,
    onRefresh: () -> Unit,
    onWineClick: (SimilarWine) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Rounded.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = recommendationType.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            IconButton(onClick = onRefresh, modifier = Modifier.size(32.dp)) {
                Icon(
                    imageVector = Icons.Rounded.Refresh,
                    contentDescription = "Refresh",
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = recommendationType.subtitle,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(wines, key = { it.wineId }) { wine ->
                SimilarWineCard(
                    wine = wine,
                    onClick = { onWineClick(wine) }
                )
            }
        }
    }
}

@Composable
private fun SimilarWineCard(
    wine: SimilarWine,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(3f / 4f)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            if (wine.imageUrl != null) {
                AsyncImage(
                    model = wine.imageUrl,
                    contentDescription = wine.wineName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Gradient overlay
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.7f)
                                )
                            )
                        )
                )

                WineInfo(
                    wine = wine,
                    lightText = true,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(10.dp)
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.WineBar,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp),
                        tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    WineInfo(wine = wine, lightText = false)
                }
            }
        }
    }
}

@Composable
private fun WineInfo(
    wine: SimilarWine,
    lightText: Boolean,
    modifier: Modifier = Modifier
) {
    val textColor = if (lightText) Color.White else MaterialTheme.colorScheme.onSurface
    val secondaryTextColor = if (lightText) Color.White.copy(alpha = 0.8f)
        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
    val tertiaryTextColor = if (lightText) Color.White.copy(alpha = 0.6f)
        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)

    Column(modifier = modifier) {
        Text(
            text = wine.wineName,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = textColor,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = wine.producerName,
            style = MaterialTheme.typography.labelSmall,
            color = secondaryTextColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        wine.locationText?.let { location ->
            Text(
                text = location,
                style = MaterialTheme.typography.labelSmall,
                color = tertiaryTextColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        wine.lastTastedFormatted?.let { lastTasted ->
            Text(
                text = "Last tasted: $lastTasted",
                style = MaterialTheme.typography.labelSmall,
                color = if (lightText) Color.White.copy(alpha = 0.7f)
                    else MaterialTheme.colorScheme.primary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        MatchBadge(matchPercentage = wine.matchPercentage)
    }
}

@Composable
private fun MatchBadge(matchPercentage: Int) {
    val color = when {
        matchPercentage >= 80 -> Color(0xFF4CAF50)
        matchPercentage >= 60 -> Color(0xFFFFC107)
        else -> Color(0xFFFF9800)
    }

    Text(
        text = "$matchPercentage% match",
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = color,
        modifier = Modifier.padding(top = 2.dp)
    )
}
