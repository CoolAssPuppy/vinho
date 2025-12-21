package com.vinho.android

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vinho.android.ui.screens.SplashScreen
import com.vinho.android.ui.screens.auth.AuthScreen
import com.vinho.android.ui.screens.home.HomeScreen
import com.vinho.android.ui.state.AuthViewModel
import com.vinho.android.ui.state.SessionViewModel
import android.net.Uri
import androidx.compose.runtime.LaunchedEffect

@Composable
fun VinhoApp(
    initialDeepLink: Uri?,
    sessionViewModel: SessionViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val sessionState by sessionViewModel.uiState.collectAsStateWithLifecycle()
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(initialDeepLink) {
        initialDeepLink?.let { sessionViewModel.handleDeepLink(it) }
    }

    when {
        sessionState.isLoading -> SplashScreen()
        sessionState.isAuthenticated -> HomeScreen(
            sessionState = sessionState,
            onSignOut = { sessionViewModel.signOut() },
            onDeleteAccount = { sessionViewModel.deleteAccount() },
            onToggleBiometrics = { enabled -> sessionViewModel.toggleBiometrics(enabled) }
        )

        else -> AuthScreen(
            viewModel = authViewModel,
            state = authState,
            onAuthenticated = { sessionViewModel.refreshSession() }
        )
    }
}
