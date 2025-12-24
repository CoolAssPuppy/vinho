package com.strategicnerds.vinho.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.strategicnerds.vinho.R

private val googleProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private val playfair = GoogleFont("Playfair Display")
private val inter = GoogleFont("Inter")

private val VinhoSerif = FontFamily(
    Font(googleFont = playfair, fontProvider = googleProvider, weight = FontWeight.Normal),
    Font(googleFont = playfair, fontProvider = googleProvider, weight = FontWeight.Bold)
)

private val VinhoSans = FontFamily(
    Font(googleFont = inter, fontProvider = googleProvider, weight = FontWeight.Normal),
    Font(googleFont = inter, fontProvider = googleProvider, weight = FontWeight.Medium)
)

val VinhoTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = VinhoSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 36.sp
    ),
    titleLarge = TextStyle(
        fontFamily = VinhoSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp
    ),
    titleMedium = TextStyle(
        fontFamily = VinhoSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = VinhoSans,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = VinhoSans,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp
    ),
    labelLarge = TextStyle(
        fontFamily = VinhoSans,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp
    )
)
