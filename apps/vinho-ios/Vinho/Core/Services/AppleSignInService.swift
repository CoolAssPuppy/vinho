import AuthenticationServices
import CryptoKit
import Foundation
import Supabase

/// Service for handling native Sign in with Apple using AuthenticationServices
final class AppleSignInService: NSObject {
    static let shared = AppleSignInService()

    private var currentNonce: String?
    private var continuation: CheckedContinuation<Session, Error>?

    private override init() {
        super.init()
    }

    /// Performs native Sign in with Apple and exchanges the identity token with Supabase
    /// - Returns: The Supabase session for the authenticated user
    func signIn() async throws -> Session {
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            // Generate a random nonce for security
            let nonce = randomNonceString()
            currentNonce = nonce
            let hashedNonce = sha256(nonce)

            // Create the Apple ID request
            let appleIDProvider = ASAuthorizationAppleIDProvider()
            let request = appleIDProvider.createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = hashedNonce

            // Create and present the authorization controller
            let authorizationController = ASAuthorizationController(authorizationRequests: [request])
            authorizationController.delegate = self
            authorizationController.presentationContextProvider = self
            authorizationController.performRequests()
        }
    }

    /// Generates a random nonce string for PKCE security
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }

        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }

        return String(nonce)
    }

    /// SHA256 hash of the input string
    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - ASAuthorizationControllerDelegate
extension AppleSignInService: ASAuthorizationControllerDelegate {
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            continuation?.resume(throwing: AuthError.invalidCredentials)
            continuation = nil
            return
        }

        guard let identityTokenData = appleIDCredential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            continuation?.resume(throwing: AuthError.noIdentityToken)
            continuation = nil
            return
        }

        guard let nonce = currentNonce else {
            continuation?.resume(throwing: AuthError.noNonce)
            continuation = nil
            return
        }

        // Exchange the identity token with Supabase
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.signInWithIdToken(
                    credentials: .init(
                        provider: .apple,
                        idToken: identityToken,
                        nonce: nonce
                    )
                )

                // Update user metadata with name if available (Apple only sends name on first sign-in)
                if let fullName = appleIDCredential.fullName,
                   let givenName = fullName.givenName,
                   let familyName = fullName.familyName {
                    let displayName = "\(givenName) \(familyName)"
                    _ = try? await SupabaseManager.shared.client.auth.update(
                        user: .init(data: ["full_name": .string(displayName)])
                    )
                }

                self.continuation?.resume(returning: session)
            } catch {
                self.continuation?.resume(throwing: error)
            }
            self.continuation = nil
            self.currentNonce = nil
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        if let authError = error as? ASAuthorizationError {
            switch authError.code {
            case .canceled:
                continuation?.resume(throwing: AuthError.userCanceled)
            case .failed:
                continuation?.resume(throwing: AuthError.failed(authError.localizedDescription))
            case .invalidResponse:
                continuation?.resume(throwing: AuthError.invalidResponse)
            case .notHandled:
                continuation?.resume(throwing: AuthError.notHandled)
            case .notInteractive:
                continuation?.resume(throwing: AuthError.notInteractive)
            case .unknown:
                continuation?.resume(throwing: AuthError.unknown(authError.localizedDescription))
            case .matchedExcludedCredential:
                continuation?.resume(throwing: AuthError.failed("Credential excluded"))
            case .credentialImport:
                continuation?.resume(throwing: AuthError.failed("Credential import error"))
            case .credentialExport:
                continuation?.resume(throwing: AuthError.failed("Credential export error"))
            case .preferSignInWithApple:
                continuation?.resume(throwing: AuthError.failed("Sign in with Apple preferred"))
            case .deviceNotConfiguredForPasskeyCreation:
                continuation?.resume(throwing: AuthError.failed("Device not configured for passkey"))
            @unknown default:
                continuation?.resume(throwing: AuthError.unknown(authError.localizedDescription))
            }
        } else {
            continuation?.resume(throwing: error)
        }
        continuation = nil
        currentNonce = nil
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding
extension AppleSignInService: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Get the key window from the active scene
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
              let window = windowScene.windows.first(where: { $0.isKeyWindow }) else {
            // Fallback to any available window
            return UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.windows.first }
                .first ?? UIWindow()
        }
        return window
    }
}

// MARK: - Auth Errors
extension AppleSignInService {
    enum AuthError: LocalizedError {
        case invalidCredentials
        case noIdentityToken
        case noNonce
        case userCanceled
        case failed(String)
        case invalidResponse
        case notHandled
        case notInteractive
        case unknown(String)

        var errorDescription: String? {
            switch self {
            case .invalidCredentials:
                return "Invalid Apple credentials received."
            case .noIdentityToken:
                return "No identity token received from Apple."
            case .noNonce:
                return "Security nonce was not generated."
            case .userCanceled:
                return "Sign in was canceled."
            case .failed(let message):
                return "Sign in failed: \(message)"
            case .invalidResponse:
                return "Invalid response from Apple."
            case .notHandled:
                return "Authorization request not handled."
            case .notInteractive:
                return "Authorization requires user interaction."
            case .unknown(let message):
                return "Unknown error: \(message)"
            }
        }
    }
}
