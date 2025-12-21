package com.vinho.android

import android.os.Bundle
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class VinhoActivity : ComponentActivity() {
    private var latestDeepLink: Uri? = null

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        latestDeepLink = intent?.data
        setContentWithDeepLink()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        latestDeepLink = intent?.data
        setContentWithDeepLink()
    }

    private fun setContentWithDeepLink() {
        setContent {
            VinhoTheme {
                Surface(modifier = Modifier) {
                    VinhoApp(initialDeepLink = latestDeepLink)
                }
            }
        }
    }
}
