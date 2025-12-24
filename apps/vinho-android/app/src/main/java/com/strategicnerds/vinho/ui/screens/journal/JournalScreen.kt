package com.strategicnerds.vinho.ui.screens.journal

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.strategicnerds.vinho.core.recommendations.VisualSimilarityService
import com.strategicnerds.vinho.data.model.SimilarWine
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.data.model.WineStats
import com.strategicnerds.vinho.ui.components.YouMightLikeSection
import com.strategicnerds.vinho.ui.state.HomeUiState
import com.strategicnerds.vinho.ui.state.SessionUiState
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

enum class JournalTab {
    TASTINGS,
    SUGGESTIONS
}

enum class TimeFilter(val label: String) {
    ALL("All"),
    TODAY("Today"),
    WEEK("Week"),
    MONTH("Month"),
    YEAR("Year")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalScreen(
    sessionState: SessionUiState,
    state: HomeUiState,
    onSearch: (String) -> Unit,
    onTastingClick: (Tasting) -> Unit = {},
    onRefresh: () -> Unit = {},
    similarityService: VisualSimilarityService? = null,
    onSimilarWineClick: (SimilarWine) -> Unit = {}
) {
    var query by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf(TimeFilter.ALL) }
    var selectedTab by remember { mutableIntStateOf(0) }

    val filteredTastings = remember(state.tastings, selectedFilter) {
        filterTastingsByTime(state.tastings, selectedFilter)
    }

    val groupedTastings = remember(filteredTastings) {
        groupTastingsByDate(filteredTastings)
    }

    PullToRefreshBox(
        isRefreshing = state.isLoading,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp)
        ) {
            // Tab selector
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp)
            ) {
                SegmentedButton(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                    icon = {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.MenuBook,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                ) {
                    Text("Tastings")
                }
                SegmentedButton(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                    icon = {
                        Icon(
                            imageVector = Icons.Rounded.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                ) {
                    Text("Suggestions")
                }
            }

            when (selectedTab) {
                0 -> TastingsTab(
                    query = query,
                    onQueryChange = {
                        query = it
                        onSearch(it)
                    },
                    selectedFilter = selectedFilter,
                    onFilterSelected = { selectedFilter = it },
                    stats = state.stats,
                    groupedTastings = groupedTastings,
                    isLoading = state.isLoading,
                    onTastingClick = onTastingClick
                )
                1 -> SuggestionsTab(
                    hasTastings = state.tastings.isNotEmpty(),
                    similarityService = similarityService,
                    onWineClick = onSimilarWineClick
                )
            }
        }
    }
}

@Composable
private fun TastingsTab(
    query: String,
    onQueryChange: (String) -> Unit,
    selectedFilter: TimeFilter,
    onFilterSelected: (TimeFilter) -> Unit,
    stats: WineStats?,
    groupedTastings: Map<String, List<Tasting>>,
    isLoading: Boolean,
    onTastingClick: (Tasting) -> Unit
) {
    Column {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            label = { Text("Search tastings") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            shape = RoundedCornerShape(16.dp),
            singleLine = true
        )

        TimeFilterChips(
            selectedFilter = selectedFilter,
            onFilterSelected = onFilterSelected
        )

        Spacer(modifier = Modifier.height(8.dp))

        StatsRow(stats = stats)

        Spacer(modifier = Modifier.height(12.dp))

        if (groupedTastings.isEmpty() && !isLoading) {
            EmptyState()
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                groupedTastings.forEach { (dateLabel, tastings) ->
                    item(key = "header_$dateLabel") {
                        DateHeader(label = dateLabel)
                    }
                    items(tastings, key = { it.id }) { tasting ->
                        TastingCard(
                            tasting = tasting,
                            onClick = { onTastingClick(tasting) }
                        )
                    }
                }
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}

@Composable
private fun SuggestionsTab(
    hasTastings: Boolean,
    similarityService: VisualSimilarityService?,
    onWineClick: (SimilarWine) -> Unit
) {
    if (similarityService == null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Suggestions not available",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
        }
        return
    }

    YouMightLikeSection(
        hasTastings = hasTastings,
        similarityService = similarityService,
        onWineClick = onWineClick,
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 8.dp)
    )
}

@Composable
private fun TimeFilterChips(
    selectedFilter: TimeFilter,
    onFilterSelected: (TimeFilter) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(TimeFilter.entries.toList()) { filter ->
            FilterChip(
                selected = filter == selectedFilter,
                onClick = { onFilterSelected(filter) },
                label = {
                    Text(
                        text = filter.label,
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    }
}

@Composable
private fun DateHeader(label: String) {
    Text(
        text = label,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "No tastings yet",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
            Text(
                text = "Scan a wine label to get started",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f)
            )
        }
    }
}

@Composable
private fun StatsRow(stats: WineStats?) {
    if (stats == null) return
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatPill(
            title = "Wines",
            value = stats.uniqueWines.toString(),
            subtitle = "${stats.totalTastings} tastings",
            modifier = Modifier.weight(1f)
        )
        StatPill(
            title = "Countries",
            value = stats.uniqueCountries.toString(),
            subtitle = "${stats.uniqueRegions} regions",
            modifier = Modifier.weight(1f)
        )
        StatPill(
            title = "Avg",
            value = String.format("%.1f", stats.averageRating ?: 0.0),
            subtitle = "Favorites ${stats.favorites}",
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun StatPill(
    title: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
private fun TastingCard(tasting: Tasting, onClick: () -> Unit) {
    val wineName = tasting.vintage?.wine?.name ?: "Unknown Wine"
    val producer = tasting.vintage?.wine?.producer?.name ?: "Unknown Producer"
    val imageUrl = tasting.imageUrl
    val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy")
    val tastedDate = tasting.tastedAt?.let {
        runCatching {
            LocalDate.parse(it.take(10)).format(dateFormatter)
        }.getOrNull()
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            if (imageUrl != null) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = "Wine image",
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(12.dp))
            } else {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color(0xFF722F37),
                                    Color(0xFF8B4553)
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = wineName.firstOrNull()?.uppercase() ?: "W",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = wineName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = producer,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    tasting.verdict?.let { verdict ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(start = 8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Star,
                                contentDescription = null,
                                tint = Color(0xFFFFC107),
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = verdict.toString(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }

                tasting.notes?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.9f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    tasting.locationCity?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                    tastedDate?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                if (tasting.isShared) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = tasting.sharedBy?.firstName?.firstOrNull()?.uppercase() ?: "U",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Shared by ${tasting.sharedBy?.firstName ?: "User"}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }
                }
            }
        }
    }
}

private fun filterTastingsByTime(tastings: List<Tasting>, filter: TimeFilter): List<Tasting> {
    if (filter == TimeFilter.ALL) return tastings

    val now = LocalDate.now()
    return tastings.filter { tasting ->
        val tastedDate = tasting.tastedAt?.let {
            runCatching { LocalDate.parse(it.take(10)) }.getOrNull()
        } ?: return@filter false

        when (filter) {
            TimeFilter.TODAY -> tastedDate == now
            TimeFilter.WEEK -> ChronoUnit.DAYS.between(tastedDate, now) < 7
            TimeFilter.MONTH -> ChronoUnit.DAYS.between(tastedDate, now) < 30
            TimeFilter.YEAR -> ChronoUnit.DAYS.between(tastedDate, now) < 365
            TimeFilter.ALL -> true
        }
    }
}

private fun groupTastingsByDate(tastings: List<Tasting>): Map<String, List<Tasting>> {
    val now = LocalDate.now()
    val yesterday = now.minusDays(1)
    val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy")

    return tastings
        .sortedByDescending { it.tastedAt }
        .groupBy { tasting ->
            val tastedDate = tasting.tastedAt?.let {
                runCatching { LocalDate.parse(it.take(10)) }.getOrNull()
            }

            when (tastedDate) {
                now -> "Today"
                yesterday -> "Yesterday"
                else -> tastedDate?.format(dateFormatter) ?: "Unknown"
            }
        }
}
