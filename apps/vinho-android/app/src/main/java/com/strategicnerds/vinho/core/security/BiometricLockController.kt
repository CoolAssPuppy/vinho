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

    /** Whether the user has enabled the biometric app lock. Kept in sync by SessionViewModel. */
    @Volatile
    private var enabled = false

    /** Guards against launching two prompts at once (e.g. resume + overlay both firing). */
    @Volatile
    private var isPrompting = false

    fun setEnabled(value: Boolean) {
        enabled = value
    }

    fun lock() {
        _isLocked.value = true
    }

    /** Re-lock when the app is backgrounded, but only if the lock is enabled. */
    fun lockIfEnabled() {
        if (enabled) _isLocked.value = true
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
        if (isPrompting) return
        isPrompting = true

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
                    isPrompting = false
                    _isLocked.value = false
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    // Stay locked; the overlay lets the user retry.
                    isPrompting = false
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
