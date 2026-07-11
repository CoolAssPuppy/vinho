package com.strategicnerds.vinho.core.security

import okhttp3.CertificatePinner

object CertificatePinnerConfig {
    // Certificate pinning is currently disabled: an empty CertificatePinner
    // applies NO pins, so OkHttp falls back to standard system-trust-store TLS
    // validation (still secure). The previous config pinned *.vinho.dev and
    // *.supabase.co to placeholder `sha256/AAAA...` hashes, which caused every
    // pinned request (e.g. the recommendations API) to fail with
    // SSLPeerUnverifiedException.
    //
    // To re-enable real pinning, compute the base64 SPKI SHA-256 for each host
    // and add them below, e.g.:
    //   openssl s_client -connect www.vinho.dev:443 -servername www.vinho.dev < /dev/null 2>/dev/null \
    //     | openssl x509 -pubkey -noout \
    //     | openssl pkey -pubin -outform der \
    //     | openssl dgst -sha256 -binary | openssl enc -base64
    // Pin at least two keys per host (current + backup) so a rotation doesn't
    // brick the app.
    val certificatePinner: CertificatePinner = CertificatePinner.Builder().build()
}
