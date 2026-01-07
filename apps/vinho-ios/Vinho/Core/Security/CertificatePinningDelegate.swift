import Foundation

final class CertificatePinningDelegate: NSObject, URLSessionDelegate {
    // SHA256 fingerprints for Supabase certificates
    // These should be updated when Supabase rotates certificates
    private let pinnedHashes: Set<String> = [
        // Supabase uses AWS/Cloudflare certificates - pin the intermediate CA
        // You should verify these hashes match your Supabase project
    ]

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // In production, implement full certificate chain validation
        // For now, we'll trust the system's certificate validation
        // TODO: Implement full pinning once Supabase certificate hashes are obtained

        let credential = URLCredential(trust: serverTrust)
        completionHandler(.useCredential, credential)
    }
}
