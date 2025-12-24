package com.strategicnerds.vinho.ui.screens.scanner

import android.Manifest
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.FlashOff
import androidx.compose.material.icons.rounded.FlashOn
import androidx.compose.material.icons.rounded.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import coil3.compose.AsyncImage
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.strategicnerds.vinho.ui.state.ProcessingStatus
import com.strategicnerds.vinho.ui.state.ScannerStep
import com.strategicnerds.vinho.ui.state.ScannerUiState
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ScannerSheet(
    state: ScannerUiState,
    onImageCaptured: (ByteArray) -> Unit,
    onUpload: (ByteArray) -> Unit,
    onToggleFlash: () -> Unit,
    onAddTastingNotes: () -> Unit,
    onDismiss: () -> Unit
) {
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    LaunchedEffect(Unit) {
        if (!cameraPermission.status.isGranted) {
            cameraPermission.launchPermissionRequest()
        }
    }

    when (state.step) {
        ScannerStep.CAMERA -> {
            if (cameraPermission.status.isGranted) {
                CameraScreen(
                    flashEnabled = state.flashEnabled,
                    onImageCaptured = onImageCaptured,
                    onToggleFlash = onToggleFlash,
                    onDismiss = onDismiss
                )
            } else {
                PermissionDeniedScreen(
                    onRequestPermission = { cameraPermission.launchPermissionRequest() },
                    onDismiss = onDismiss
                )
            }
        }
        ScannerStep.RESULT -> {
            ScanResultScreen(
                state = state,
                onUpload = onUpload,
                onAddTastingNotes = onAddTastingNotes,
                onDismiss = onDismiss
            )
        }
    }
}

@Composable
private fun CameraScreen(
    flashEnabled: Boolean,
    onImageCaptured: (ByteArray) -> Unit,
    onToggleFlash: () -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var isCapturing by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri ->
            uri?.let { data ->
                context.readBytes(data)?.let(onImageCaptured)
            }
        }
    )

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Camera Preview
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }

                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }

                    val capture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()
                    imageCapture = capture

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    try {
                        cameraProvider.unbindAll()
                        val camera = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            capture
                        )
                        camera.cameraControl.enableTorch(flashEnabled)
                    } catch (e: Exception) {
                        // Camera binding failed
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            update = { _ ->
                // Update flash when state changes
                val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
                cameraProviderFuture.addListener({
                    try {
                        val cameraProvider = cameraProviderFuture.get()
                        cameraProvider.unbindAll()

                        val preview = Preview.Builder().build()
                        val capture = ImageCapture.Builder()
                            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                            .build()
                        imageCapture = capture

                        val camera = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            capture
                        )
                        camera.cameraControl.enableTorch(flashEnabled)
                    } catch (e: Exception) {
                        // Ignore
                    }
                }, ContextCompat.getMainExecutor(context))
            }
        )

        // Gradient overlays
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp)
                .align(Alignment.TopCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent)
                    )
                )
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                    )
                )
        )

        // Frame Guide
        Canvas(modifier = Modifier.fillMaxSize()) {
            val frameWidth = 280.dp.toPx()
            val frameHeight = 380.dp.toPx()
            val left = (size.width - frameWidth) / 2
            val top = (size.height - frameHeight) / 2

            // Semi-transparent overlay outside the frame
            drawRect(
                color = Color.Black.copy(alpha = 0.3f),
                size = size
            )

            // Clear the frame area
            drawRoundRect(
                color = Color.Transparent,
                topLeft = Offset(left, top),
                size = Size(frameWidth, frameHeight),
                cornerRadius = CornerRadius(20.dp.toPx()),
                blendMode = BlendMode.Clear
            )

            // Frame border
            drawRoundRect(
                color = Color.White.copy(alpha = 0.5f),
                topLeft = Offset(left, top),
                size = Size(frameWidth, frameHeight),
                cornerRadius = CornerRadius(20.dp.toPx()),
                style = Stroke(width = 2.dp.toPx())
            )

            // Corner markers
            val cornerLength = 30.dp.toPx()
            val strokeWidth = 3.dp.toPx()

            // Top left
            drawPath(
                path = Path().apply {
                    moveTo(left, top + cornerLength)
                    lineTo(left, top)
                    lineTo(left + cornerLength, top)
                },
                color = Color.White,
                style = Stroke(width = strokeWidth)
            )

            // Top right
            drawPath(
                path = Path().apply {
                    moveTo(left + frameWidth - cornerLength, top)
                    lineTo(left + frameWidth, top)
                    lineTo(left + frameWidth, top + cornerLength)
                },
                color = Color.White,
                style = Stroke(width = strokeWidth)
            )

            // Bottom left
            drawPath(
                path = Path().apply {
                    moveTo(left, top + frameHeight - cornerLength)
                    lineTo(left, top + frameHeight)
                    lineTo(left + cornerLength, top + frameHeight)
                },
                color = Color.White,
                style = Stroke(width = strokeWidth)
            )

            // Bottom right
            drawPath(
                path = Path().apply {
                    moveTo(left + frameWidth - cornerLength, top + frameHeight)
                    lineTo(left + frameWidth, top + frameHeight)
                    lineTo(left + frameWidth, top + frameHeight - cornerLength)
                },
                color = Color.White,
                style = Stroke(width = strokeWidth)
            )
        }

        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 60.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f))
            ) {
                Icon(
                    Icons.Rounded.Close,
                    contentDescription = "Close",
                    tint = Color.White
                )
            }

            IconButton(
                onClick = onToggleFlash,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f))
            ) {
                Icon(
                    if (flashEnabled) Icons.Rounded.FlashOn else Icons.Rounded.FlashOff,
                    contentDescription = "Flash",
                    tint = if (flashEnabled) Color.Yellow else Color.White
                )
            }
        }

        // Instructions
        Text(
            text = "Position wine label in frame",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
            color = Color.White,
            modifier = Modifier
                .align(Alignment.Center)
                .padding(top = 250.dp)
        )

        // Bottom Controls
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 40.dp, vertical = 50.dp)
                .align(Alignment.BottomCenter),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Library button
            IconButton(
                onClick = {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                modifier = Modifier.size(50.dp)
            ) {
                Icon(
                    Icons.Rounded.PhotoLibrary,
                    contentDescription = "Photo Library",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
            }

            // Capture button
            Box(
                modifier = Modifier
                    .size(75.dp)
                    .border(3.dp, Color.White, CircleShape)
                    .padding(5.dp)
                    .clip(CircleShape)
                    .background(if (isCapturing) Color.White.copy(alpha = 0.7f) else Color.White)
                    .clickable(enabled = !isCapturing) {
                        isCapturing = true
                        imageCapture?.takePicture(
                            cameraExecutor,
                            object : ImageCapture.OnImageCapturedCallback() {
                                override fun onCaptureSuccess(image: ImageProxy) {
                                    val buffer = image.planes[0].buffer
                                    val bytes = ByteArray(buffer.remaining())
                                    buffer.get(bytes)

                                    // Convert to properly rotated JPEG
                                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                    val rotatedBitmap = bitmap.rotate(image.imageInfo.rotationDegrees.toFloat())
                                    val outputStream = ByteArrayOutputStream()
                                    rotatedBitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)

                                    image.close()
                                    isCapturing = false
                                    onImageCaptured(outputStream.toByteArray())
                                }

                                override fun onError(exception: ImageCaptureException) {
                                    isCapturing = false
                                }
                            }
                        )
                    }
            )

            // Spacer for balance
            Spacer(modifier = Modifier.size(50.dp))
        }
    }
}

@Composable
private fun ScanResultScreen(
    state: ScannerUiState,
    onUpload: (ByteArray) -> Unit,
    onAddTastingNotes: () -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val imageBytes = state.capturedImageBytes

    LaunchedEffect(imageBytes) {
        if (imageBytes != null && state.processingStatus == ProcessingStatus.IDLE) {
            onUpload(imageBytes)
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            // Display captured image
            if (imageBytes != null) {
                val bitmap = remember(imageBytes) {
                    BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                }
                if (bitmap != null) {
                    AsyncImage(
                        model = bitmap,
                        contentDescription = "Captured wine",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(250.dp)
                            .clip(RoundedCornerShape(16.dp)),
                        contentScale = ContentScale.Fit
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Processing status card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = when (state.processingStatus) {
                    ProcessingStatus.FAILED -> MaterialTheme.colorScheme.errorContainer
                    ProcessingStatus.COMPLETED -> Color(0xFF1B5E20).copy(alpha = 0.1f)
                    else -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    when (state.processingStatus) {
                        ProcessingStatus.UPLOADING, ProcessingStatus.PROCESSING -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                        }
                        ProcessingStatus.COMPLETED -> {
                            Text(
                                text = "OK",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }
                        ProcessingStatus.FAILED -> {
                            Text(
                                text = "!",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        else -> {}
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = when (state.processingStatus) {
                                ProcessingStatus.UPLOADING -> "Uploading wine image..."
                                ProcessingStatus.PROCESSING -> "Processing wine label..."
                                ProcessingStatus.COMPLETED -> "Wine ready for tasting notes!"
                                ProcessingStatus.FAILED -> "Processing failed"
                                else -> "Preparing..."
                            },
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = when (state.processingStatus) {
                                ProcessingStatus.UPLOADING, ProcessingStatus.PROCESSING ->
                                    "Our AI sommelier is identifying this wine"
                                ProcessingStatus.COMPLETED ->
                                    "Add your personal tasting notes now"
                                ProcessingStatus.FAILED ->
                                    state.error ?: "Please try again"
                                else -> ""
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Add tasting notes button
            Button(
                onClick = onAddTastingNotes,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = state.processingStatus == ProcessingStatus.COMPLETED ||
                        state.processingStatus == ProcessingStatus.PROCESSING,
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = "Add Tasting Notes",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Skip button
            TextButton(onClick = onDismiss) {
                Text(
                    text = "Skip for Now",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PermissionDeniedScreen(
    onRequestPermission: () -> Unit,
    onDismiss: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Camera Permission Required",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "To scan wine labels, we need access to your camera. You can also select photos from your library.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = onRequestPermission,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Grant Camera Access")
            }

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    }
}

private fun Context.readBytes(uri: Uri): ByteArray? {
    return contentResolver.openInputStream(uri)?.use(InputStream::readBytes)
}

private fun Bitmap.rotate(degrees: Float): Bitmap {
    val matrix = Matrix().apply { postRotate(degrees) }
    return Bitmap.createBitmap(this, 0, 0, width, height, matrix, true)
}
