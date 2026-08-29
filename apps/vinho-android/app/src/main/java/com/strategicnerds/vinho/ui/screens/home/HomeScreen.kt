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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.PhotoCamera
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.strategicnerds.vinho.core.places.GooglePlacesService
import com.strategicnerds.vinho.data.model.Tasting
import com.strategicnerds.vinho.ui.components.VinhoLogo
import com.strategicnerds.vinho.ui.screens.journal.JournalScreen
import com.strategicnerds.vinho.ui.screens.journal.TastingDetailScreen
import com.strategicnerds.vinho.ui.screens.journal.TastingEditorScreen
import com.strategicnerds.vinho.ui.screens.map.MapScreen
import com.strategicnerds.vinho.ui.screens.profile.NotificationsScreen
import com.strategicnerds.vinho.ui.screens.profile.AboutScreen
import com.strategicnerds.vinho.ui.screens.profile.DataExportScreen
import com.strategicnerds.vinho.ui.screens.profile.ProfileEditScreen
import com.strategicnerds.vinho.ui.screens.profile.ProfileSheet
import com.strategicnerds.vinho.ui.screens.profile.VivinoImportScreen
import com.strategicnerds.vinho.ui.screens.profile.WinePreferencesScreen
import com.strategicnerds.vinho.ui.screens.scanner.ScannerSheet
import com.strategicnerds.vinho.ui.screens.sharing.SharingScreen
import com.strategicnerds.vinho.ui.screens.wines.WineDetailScreen
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
    onProfileUpdated: () -> Unit,
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
    var selectedWineId by remember { mutableStateOf<String?>(null) }
    var showSharing by remember { mutableStateOf(false) }
    var showNotifications by remember { mutableStateOf(false) }
    var showWinePreferences by remember { mutableStateOf(false) }
    var showVivinoImport by remember { mutableStateOf(false) }
    var showAbout by remember { mutableStateOf(false) }
    var showDataExport by remember { mutableStateOf(false) }

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
                VinhoFloatingNavigation(
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
                        onSimilarWineClick = { similar -> selectedWineId = similar.wineId }
                    )

                    else -> MapScreen(
                        tastings = homeState.tastings,
                        stats = homeState.stats,
                        onTastingClick = { tasting ->
                            selectedTasting = tasting
                            showTastingDetail = true
                        }
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
                stats = homeState.stats,
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
                },
                onManageSharing = {
                    showProfile = false
                    showSharing = true
                },
                onManageNotifications = {
                    showProfile = false
                    showNotifications = true
                },
                onManageWinePreferences = {
                    showProfile = false
                    showWinePreferences = true
                },
                onImportVivino = {
                    showProfile = false
                    showVivinoImport = true
                },
                onAbout = {
                    showProfile = false
                    showAbout = true
                },
                onExportData = {
                    showProfile = false
                    showDataExport = true
                }
            )
        }
    }

    if (showSharing) {
        ModalBottomSheet(
            onDismissRequest = { showSharing = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            SharingScreen(
                userId = sessionState.userProfile?.id.orEmpty(),
                onDismiss = { showSharing = false }
            )
        }
    }

    if (showNotifications) {
        ModalBottomSheet(
            onDismissRequest = { showNotifications = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            NotificationsScreen(
                onDismiss = { showNotifications = false }
            )
        }
    }

    if (showWinePreferences) {
        ModalBottomSheet(
            onDismissRequest = { showWinePreferences = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            WinePreferencesScreen(
                userId = sessionState.userProfile?.id.orEmpty(),
                onDismiss = { showWinePreferences = false }
            )
        }
    }

    if (showVivinoImport) {
        ModalBottomSheet(
            onDismissRequest = { showVivinoImport = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            VivinoImportScreen(onDismiss = { showVivinoImport = false })
        }
    }

    if (showAbout) {
        ModalBottomSheet(
            onDismissRequest = { showAbout = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            AboutScreen(onDismiss = { showAbout = false })
        }
    }

    if (showDataExport) {
        ModalBottomSheet(
            onDismissRequest = { showDataExport = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            DataExportScreen(onDismiss = { showDataExport = false })
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
                    onProfileUpdated()
                }
            )
        }
    }

    // Wine detail (reached from the "You might like" recommendations). Previously
    // the wine catalog/detail screens were built but unreachable.
    selectedWineId?.let { wineId ->
        ModalBottomSheet(
            onDismissRequest = { selectedWineId = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            WineDetailScreen(
                wineId = wineId,
                onDismiss = { selectedWineId = null },
                onTastingClick = { tasting ->
                    selectedWineId = null
                    selectedTasting = tasting
                    showTastingDetail = true
                },
                onAddTasting = {
                    selectedWineId = null
                    editingTasting = null
                    showTastingEditor = true
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
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val avatarUrl = sessionState.userProfile?.avatarUrl
        val initial = sessionState.userProfile?.fullName?.firstOrNull()?.uppercase()
            ?: sessionState.userProfile?.email?.firstOrNull()?.uppercase() ?: "V"

        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .clickable { onProfileTapped() }
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            if (!avatarUrl.isNullOrBlank()) {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = "Profile",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initial.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
        }
        Spacer(modifier = Modifier.weight(1f))
        VinhoLogo()
        Spacer(modifier = Modifier.weight(1f))
        Spacer(modifier = Modifier.size(32.dp))
    }
}

@Composable
private fun VinhoFloatingNavigation(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    onScanTapped: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .shadow(20.dp, RoundedCornerShape(percent = 50)),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f),
        shape = RoundedCornerShape(percent = 50),
        tonalElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BottomBarIcon(
                icon = Icons.AutoMirrored.Rounded.MenuBook,
                contentDescription = "Journal",
                isSelected = selectedTab == 0,
                onClick = { onTabSelected(0) }
            )
            Spacer(modifier = Modifier.weight(1f))
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .shadow(10.dp, CircleShape)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable { onScanTapped() }
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Rounded.PhotoCamera,
                    contentDescription = "Scan wine label",
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            BottomBarIcon(
                icon = Icons.Rounded.Map,
                contentDescription = "Map",
                isSelected = selectedTab == 1,
                onClick = { onTabSelected(1) }
            )
        }
    }
}

@Composable
private fun BottomBarIcon(
    icon: ImageVector,
    contentDescription: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .clickable { onClick() }
            .padding(10.dp),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (isSelected) {
                MaterialTheme.colorScheme.secondary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
    }
}
