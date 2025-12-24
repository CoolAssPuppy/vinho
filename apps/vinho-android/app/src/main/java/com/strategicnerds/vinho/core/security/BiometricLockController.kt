package com.strategicnerds.vinho.core.security

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.concurrent.Executor
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BiometricLockController @Inject constructor() {

    private val _isLocked = MutableStateFlow(false)
    val isLocked: StateFlow<Boolean> = _isLocked

    fun lock() {
        _isLocked.value = true
    }

    fun unlock() {
        _isLocked.value = false
    }

    fun showPrompt(
        activity: FragmentActivity,
        title: String = "Unlock Vinho",
        subtitle: String = "Authenticate to continue",
        onSuccess: () -> Unit = {}
    ) {
        val executor: Executor = ContextCompat.getMainExecutor(activity)
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText("Cancel")
            .build()

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    _isLocked.value = false
                    onSuccess()
                }
            }
        )
        biometricPrompt.authenticate(promptInfo)
    }

    fun isSupported(context: Context): Boolean {
        val manager = BiometricManager.from(context)
        return manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS
    }
}
