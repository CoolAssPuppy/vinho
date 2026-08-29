package com.strategicnerds.vinho

import android.net.Uri
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.strategicnerds.vinho.core.security.BiometricLockController
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class VinhoActivity : FragmentActivity() {
    @Inject
    lateinit var biometricLockController: BiometricLockController

    private var latestDeepLink: Uri? = null

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        latestDeepLink = intent.data
        setContentWithDeepLink()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        latestDeepLink = intent?.data
        setContentWithDeepLink()
    }

    override fun onStop() {
        super.onStop()
        // Re-lock whenever the app leaves the foreground (if the lock is enabled).
        biometricLockController.lockIfEnabled()
    }

    override fun onStart() {
        super.onStart()
        // Returning to a locked app immediately prompts for authentication.
        if (biometricLockController.isLocked.value) {
            biometricLockController.showPrompt(this)
        }
    }

    private fun setContentWithDeepLink() {
        setContent {
            VinhoTheme {
                Surface(modifier = Modifier) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        VinhoApp(initialDeepLink = latestDeepLink)
                        BiometricLockOverlay(
                            controller = biometricLockController,
                            activity = this@VinhoActivity
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BiometricLockOverlay(
    controller: BiometricLockController,
    activity: FragmentActivity
) {
    val isLocked by controller.isLocked.collectAsStateWithLifecycle()
    if (!isLocked) return

    // Auto-present the prompt as soon as the lock engages while in the foreground.
    LaunchedEffect(Unit) { controller.showPrompt(activity) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Lock,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Vinho is locked",
                    style = MaterialTheme.typography.titleMedium
                )
                Button(onClick = { controller.showPrompt(activity) }) {
                    Text("Unlock")
                }
            }
        }
    }
}
