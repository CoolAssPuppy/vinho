package com.strategicnerds.vinho.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.strategicnerds.vinho.VinhoGradient
import com.strategicnerds.vinho.core.places.GooglePlacesService
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.ui.components.VinhoLogo
import com.strategicnerds.vinho.ui.screens.journal.JournalScreen
import com.strategicnerds.vinho.ui.screens.journal.TastingDetailScreen
import com.strategicnerds.vinho.ui.screens.journal.TastingEditorScreen
import com.strategicnerds.vinho.ui.screens.map.MapScreen
import com.strategicnerds.vinho.ui.screens.profile.ProfileEditScreen
import com.strategicnerds.vinho.ui.screens.profile.ProfileSheet
import com.strategicnerds.vinho.ui.screens.scanner.ScannerSheet
import com.strategicnerds.vinho.ui.state.HomeViewModel
import com.strategicnerds.vinho.ui.state.ScannerViewModel
import com.strategicnerds.vinho.ui.state.SessionUiState
import com.strategicnerds.vinho.ui.state.SuggestionsViewModel

@Composable
fun HomeScreen(
    sessionState: SessionUiState,
    onSignOut: () -> Unit,
    onDeleteAccount: () -> Unit,
    onToggleBiometrics: (Boolean) -> Unit,
    homeViewModel: HomeViewModel = hiltViewModel(),
    scannerViewModel: ScannerViewModel = hiltViewModel(),
    suggestionsViewModel: SuggestionsViewModel = hiltViewModel()
) {
    val placesService = homeViewModel.placesService
    val homeState by homeViewModel.uiState.collectAsStateWithLifecycle()
    val scannerState by scannerViewModel.uiState.collectAsStateWithLifecycle()
    val suggestionsState by suggestionsViewModel.uiState.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableIntStateOf(0) }
    var showProfile by remember { mutableStateOf(false) }
    var showScanner by remember { mutableStateOf(false) }
    var selectedTasting by remember { mutableStateOf<Tasting?>(null) }
    var editingTasting by remember { mutableStateOf<Tasting?>(null) }
    var showTastingDetail by remember { mutableStateOf(false) }
    var showTastingEditor by remember { mutableStateOf(false) }
    var showProfileEdit by remember { mutableStateOf(false) }
    var showScannerTastingEditor by remember { mutableStateOf(false) }

    LaunchedEffect(sessionState.userProfile?.id) {
        sessionState.userProfile?.id?.let { homeViewModel.load(it) }
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    Surface(color = MaterialTheme.colorScheme.background) {
        Scaffold(
            topBar = {
                HomeTopBar(
                    sessionState = sessionState,
                    onProfileTapped = { showProfile = true }
                )
            },
            bottomBar = {
                VinhoBottomBar(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it },
                    onScanTapped = { showScanner = true }
                )
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
            ) {
                when (selectedTab) {
                    0 -> JournalScreen(
                        sessionState = sessionState,
                        state = homeState,
                        suggestionsState = suggestionsState,
                        onSearch = { query ->
                            sessionState.userProfile?.id?.let { homeViewModel.search(query, it) }
                        },
                        onTastingClick = { tasting ->
                            selectedTasting = tasting
                            showTastingDetail = true
                        },
                        onRefresh = {
                            homeViewModel.load(sessionState.userProfile?.id)
                        },
                        onLoadSuggestions = {
                            suggestionsViewModel.loadIfNeeded(homeState.tastings.isNotEmpty())
                        },
                        onRefreshSuggestions = {
                            suggestionsViewModel.refresh()
                        },
                        onSimilarWineClick = { /* TODO: Navigate to wine detail */ }
                    )

                    else -> MapScreen(
                        tastings = homeState.tastings,
                        stats = homeState.stats
                    )
                }
            }
        }
    }

    if (showProfile) {
        ModalBottomSheet(
            onDismissRequest = { showProfile = false },
            sheetState = sheetState
        ) {
            ProfileSheet(
                sessionState = sessionState,
                onSignOut = {
                    showProfile = false
                    onSignOut()
                },
                onDeleteAccount = {
                    showProfile = false
                    onDeleteAccount()
                },
                onToggleBiometrics = onToggleBiometrics,
                onEditProfile = {
                    showProfile = false
                    showProfileEdit = true
                }
            )
        }
    }

    if (showScanner) {
        ModalBottomSheet(
            onDismissRequest = {
                showScanner = false
                scannerViewModel.clearStatus()
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            ScannerSheet(
                state = scannerState,
                onImageCaptured = { imageBytes ->
                    scannerViewModel.onImageCaptured(imageBytes)
                },
                onUpload = { data ->
                    val userId = sessionState.userProfile?.id ?: return@ScannerSheet
                    scannerViewModel.uploadScan(data, userId)
                },
                onToggleFlash = {
                    scannerViewModel.toggleFlash()
                },
                onAddTastingNotes = {
                    showScanner = false
                    editingTasting = scannerState.pendingTasting
                    showScannerTastingEditor = true
                },
                onDismiss = {
                    showScanner = false
                    scannerViewModel.clearStatus()
                    homeViewModel.load(sessionState.userProfile?.id)
                }
            )
        }
    }

    if (showScannerTastingEditor) {
        ModalBottomSheet(
            onDismissRequest = {
                showScannerTastingEditor = false
                editingTasting = null
                scannerViewModel.clearStatus()
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            TastingEditorScreen(
                existingTasting = editingTasting,
                userId = sessionState.userProfile?.id ?: "",
                onDismiss = {
                    showScannerTastingEditor = false
                    editingTasting = null
                    scannerViewModel.clearStatus()
                },
                onSaved = {
                    showScannerTastingEditor = false
                    editingTasting = null
                    scannerViewModel.clearStatus()
                    homeViewModel.load(sessionState.userProfile?.id)
                    homeViewModel.onTastingSaved()
                },
                placesService = placesService
            )
        }
    }

    if (showTastingDetail && selectedTasting != null) {
        ModalBottomSheet(
            onDismissRequest = {
                showTastingDetail = false
                selectedTasting = null
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            TastingDetailScreen(
                tasting = selectedTasting!!,
                onDismiss = {
                    showTastingDetail = false
                    selectedTasting = null
                },
                onEdit = {
                    editingTasting = selectedTasting
                    showTastingDetail = false
                    showTastingEditor = true
                },
                onDelete = {
                    showTastingDetail = false
                    selectedTasting = null
                    homeViewModel.load(sessionState.userProfile?.id)
                }
            )
        }
    }

    if (showTastingEditor) {
        ModalBottomSheet(
            onDismissRequest = {
                showTastingEditor = false
                editingTasting = null
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            TastingEditorScreen(
                existingTasting = editingTasting,
                userId = sessionState.userProfile?.id ?: "",
                onDismiss = {
                    showTastingEditor = false
                    editingTasting = null
                },
                onSaved = {
                    showTastingEditor = false
                    editingTasting = null
                    homeViewModel.load(sessionState.userProfile?.id)
                    homeViewModel.onTastingSaved()
                },
                placesService = placesService
            )
        }
    }

    if (showProfileEdit) {
        ModalBottomSheet(
            onDismissRequest = { showProfileEdit = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            ProfileEditScreen(
                userId = sessionState.userProfile?.id ?: "",
                onDismiss = { showProfileEdit = false },
                onSaved = {
                    showProfileEdit = false
                    // Refresh session to pick up profile changes
                }
            )
        }
    }
}

@Composable
private fun HomeTopBar(
    sessionState: SessionUiState,
    onProfileTapped: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .clip(CircleShape)
                .background(VinhoGradient)
                .clickable { onProfileTapped() }
                .padding(12.dp),
            contentAlignment = Alignment.Center
        ) {
            val initial = sessionState.userProfile?.fullName?.firstOrNull()?.uppercase()
                ?: sessionState.userProfile?.email?.firstOrNull()?.uppercase() ?: "V"
            Text(
                text = initial.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimary
            )
        }
        Spacer(modifier = Modifier.weight(1f))
        VinhoLogo()
        Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun VinhoBottomBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    onScanTapped: () -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 6.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BottomBarIcon(
                icon = { Icon(Icons.AutoMirrored.Rounded.MenuBook, contentDescription = "Journal") },
                label = "Journal",
                isSelected = selectedTab == 0,
                onClick = { onTabSelected(0) }
            )
            Spacer(modifier = Modifier.weight(1f))
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(VinhoGradient)
                    .clickable { onScanTapped() }
                    .padding(14.dp)
            ) {
                Text(
                    text = "\uD83D\uDCF7",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            BottomBarIcon(
                icon = { Icon(Icons.Rounded.Map, contentDescription = "Map") },
                label = "Map",
                isSelected = selectedTab == 1,
                onClick = { onTabSelected(1) }
            )
        }
    }
}

@Composable
private fun BottomBarIcon(
    icon: @Composable () -> Unit,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(vertical = 6.dp, horizontal = 10.dp)
    ) {
        icon()
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(
                alpha = 0.6f
            )
        )
    }
}
