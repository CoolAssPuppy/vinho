package com.strategicnerds.vinho.core.security

import okhttp3.CertificatePinner

object CertificatePinnerConfig {
    // Certificate pins for vinho.dev and Supabase
    // These should be updated when certificates are rotated
    val certificatePinner: CertificatePinner = CertificatePinner.Builder()
        .add("*.vinho.dev", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=") // Placeholder - get real hash
        .add("*.supabase.co", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=") // Placeholder - get real hash
        .build()

    // For development, use a lenient pinner that logs but doesn't fail
    val developmentPinner: CertificatePinner = CertificatePinner.Builder().build()
}
