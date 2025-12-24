package com.strategicnerds.vinho.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.strategicnerds.vinho.R
import com.strategicnerds.vinho.ui.components.VinhoLogo
import com.strategicnerds.vinho.ui.state.AuthViewModel
import com.strategicnerds.vinho.ui.state.AuthUiState
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.Apple

@Composable
fun AuthScreen(
    viewModel: AuthViewModel,
    state: AuthUiState,
    onAuthenticated: () -> Unit
) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isSignUp by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }
    var showForgotPasswordDialog by remember { mutableStateOf(false) }
    var forgotPasswordEmail by remember { mutableStateOf("") }

    LaunchedEffect(state.didAuthenticate) {
        if (state.didAuthenticate) {
            onAuthenticated()
        }
    }

    LaunchedEffect(state.resetPasswordSent) {
        if (state.resetPasswordSent) {
            showForgotPasswordDialog = false
            viewModel.clearResetPasswordSent()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            VinhoLogo()
            Text(
                text = "A modern wine journal backed by Supabase.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isSignUp) {
                        OutlinedTextField(
                            value = fullName,
                            onValueChange = { fullName = it },
                            leadingIcon = { Icon(Icons.Rounded.Person, contentDescription = null) },
                            label = { Text("Full name") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        label = { Text("Email") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(
                                    imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = if (showPassword) "Hide password" else "Show password"
                                )
                            }
                        },
                        label = { Text("Password") },
                        modifier = Modifier.fillMaxWidth(),
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true
                    )

                    AnimatedVisibility(
                        visible = isSignUp && password.isNotEmpty(),
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            PasswordStrengthBar(password = password)
                            PasswordRequirements(password = password)
                        }
                    }

                    if (!isSignUp) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            TextButton(
                                onClick = {
                                    forgotPasswordEmail = email
                                    showForgotPasswordDialog = true
                                }
                            ) {
                                Text(
                                    text = "Forgot Password?",
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }

                    Button(
                        onClick = {
                            if (isSignUp) {
                                viewModel.signUp(email.trim(), password.trim(), fullName.trim())
                            } else {
                                viewModel.signIn(email.trim(), password.trim())
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !state.isLoading && email.isNotBlank() && password.isNotBlank() &&
                                (!isSignUp || isPasswordValid(password))
                    ) {
                        Text(if (isSignUp) "Create account" else "Sign in")
                    }
                    if (state.error != null) {
                        Text(
                            text = state.error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "or continue with",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SocialLoginButton(
                        onClick = { viewModel.signInWith(Google) },
                        iconResId = "google",
                        contentDescription = "Sign in with Google"
                    )
                    SocialLoginButton(
                        onClick = { viewModel.signInWith(Apple) },
                        iconResId = "apple",
                        contentDescription = "Sign in with Apple"
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "We only request your email and basic profile to authenticate.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TextButton(onClick = { isSignUp = !isSignUp }) {
                Text(
                    text = if (isSignUp) "Already have an account? Sign in" else "New to Vinho? Create an account",
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    if (showForgotPasswordDialog) {
        ForgotPasswordDialog(
            email = forgotPasswordEmail,
            onEmailChange = { forgotPasswordEmail = it },
            onDismiss = { showForgotPasswordDialog = false },
            onSubmit = {
                viewModel.resetPassword(forgotPasswordEmail.trim())
            },
            isLoading = state.isLoading,
            error = state.error
        )
    }
}

@Composable
private fun PasswordStrengthBar(password: String) {
    val strength = calculatePasswordStrength(password)
    val (label, color, progress) = when {
        strength <= 1 -> Triple("Weak", MaterialTheme.colorScheme.error, 0.25f)
        strength == 2 -> Triple("Fair", Color(0xFFFFA000), 0.5f)
        strength == 3 -> Triple("Good", Color(0xFFCDDC39), 0.75f)
        else -> Triple("Strong", Color(0xFF4CAF50), 1f)
    }

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Password strength",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium,
                color = color
            )
        }
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp)),
            color = color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}

@Composable
private fun PasswordRequirements(password: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        PasswordRequirementRow(
            text = "At least 8 characters",
            isMet = password.length >= 8
        )
        PasswordRequirementRow(
            text = "Contains uppercase letter",
            isMet = password.any { it.isUpperCase() }
        )
        PasswordRequirementRow(
            text = "Contains lowercase letter",
            isMet = password.any { it.isLowerCase() }
        )
        PasswordRequirementRow(
            text = "Contains number",
            isMet = password.any { it.isDigit() }
        )
    }
}

@Composable
private fun PasswordRequirementRow(text: String, isMet: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .clip(CircleShape)
                .background(
                    if (isMet) Color(0xFF4CAF50).copy(alpha = 0.2f)
                    else MaterialTheme.colorScheme.surfaceVariant
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (isMet) Icons.Default.Check else Icons.Default.Close,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = if (isMet) Color(0xFF4CAF50) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
            )
        }
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = if (isMet) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
        )
    }
}

@Composable
private fun ForgotPasswordDialog(
    email: String,
    onEmailChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
    isLoading: Boolean,
    error: String?
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Reset Password",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Enter your email address and we'll send you a link to reset your password.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true
                )
                if (error != null) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onSubmit,
                enabled = !isLoading && email.isNotBlank()
            ) {
                Text("Send Reset Link")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

private fun calculatePasswordStrength(password: String): Int {
    var score = 0
    if (password.length >= 8) score++
    if (password.any { it.isLowerCase() }) score++
    if (password.any { it.isUpperCase() }) score++
    if (password.any { it.isDigit() }) score++
    return score
}

private fun isPasswordValid(password: String): Boolean {
    return password.length >= 8 &&
            password.any { it.isUpperCase() } &&
            password.any { it.isLowerCase() } &&
            password.any { it.isDigit() }
}

@Composable
private fun SocialLoginButton(
    onClick: () -> Unit,
    iconResId: String,
    contentDescription: String
) {
    val iconRes = when (iconResId) {
        "google" -> R.drawable.ic_google
        "apple" -> R.drawable.ic_apple
        else -> R.drawable.ic_google
    }

    Surface(
        onClick = onClick,
        modifier = Modifier.size(56.dp),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
        shadowElevation = 2.dp
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = iconRes),
                contentDescription = contentDescription,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}
