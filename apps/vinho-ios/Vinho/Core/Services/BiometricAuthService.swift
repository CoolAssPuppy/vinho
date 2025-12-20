//
//  BiometricAuthService.swift
//  Vinho
//
//  Service for managing biometric authentication (Face ID / Touch ID)
//

import Foundation
import LocalAuthentication
import SwiftUI

/// Service for managing biometric authentication
@MainActor
final class BiometricAuthService: ObservableObject {

    // MARK: - Singleton

    static let shared = BiometricAuthService()

    // MARK: - Published Properties

    /// Whether the app is currently locked
    @Published var isLocked: Bool = false

    /// Whether biometric authentication is available on this device
    @Published private(set) var isBiometricAvailable: Bool = false

    /// The type of biometric authentication available
    @Published private(set) var biometricType: BiometricType = .none

    /// Error message if authentication fails
    @Published var errorMessage: String?

    // MARK: - App Storage

    /// User preference for biometric authentication
    @AppStorage("biometric_auth_enabled") var biometricEnabled: Bool = false

    // MARK: - Biometric Type Enum

    enum BiometricType {
        case none
        case touchID
        case faceID
        case opticID

        var displayName: String {
            switch self {
            case .none: return "Biometric"
            case .touchID: return "Touch ID"
            case .faceID: return "Face ID"
            case .opticID: return "Optic ID"
            }
        }

        var iconName: String {
            switch self {
            case .none: return "lock"
            case .touchID: return "touchid"
            case .faceID: return "faceid"
            case .opticID: return "opticid"
            }
        }
    }

    // MARK: - Initialization

    private init() {
        checkBiometricAvailability()
    }

    // MARK: - Public Methods

    /// Check if biometric authentication is available on this device
    func checkBiometricAvailability() {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            isBiometricAvailable = true

            switch context.biometryType {
            case .touchID:
                biometricType = .touchID
            case .faceID:
                biometricType = .faceID
            case .opticID:
                biometricType = .opticID
            case .none:
                biometricType = .none
            @unknown default:
                biometricType = .none
            }
        } else {
            isBiometricAvailable = false
            biometricType = .none
        }
    }

    /// Lock the app (called when app goes to background)
    func lockApp() {
        guard biometricEnabled else { return }
        isLocked = true
        errorMessage = nil
    }

    /// Unlock the app (called on successful authentication)
    func unlockApp() {
        isLocked = false
        errorMessage = nil
    }

    /// Authenticate using biometrics
    func authenticate() async -> Bool {
        let context = LAContext()
        var error: NSError?

        // Check if biometric authentication is available
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            await MainActor.run {
                errorMessage = error?.localizedDescription ?? "Biometric authentication not available"
            }
            return false
        }

        let reason = "Unlock Vinho to access your wine cellar"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            await MainActor.run {
                if success {
                    unlockApp()
                }
            }

            return success
        } catch let authError as LAError {
            await MainActor.run {
                switch authError.code {
                case .userCancel:
                    errorMessage = nil // User cancelled, no error message needed
                case .userFallback:
                    errorMessage = "Please use your device passcode"
                case .biometryNotAvailable:
                    errorMessage = "\(biometricType.displayName) is not available"
                case .biometryNotEnrolled:
                    errorMessage = "\(biometricType.displayName) is not set up"
                case .biometryLockout:
                    errorMessage = "\(biometricType.displayName) is locked. Use your device passcode."
                default:
                    errorMessage = "Authentication failed. Try again."
                }
            }
            return false
        } catch {
            await MainActor.run {
                errorMessage = "Authentication failed. Try again."
            }
            return false
        }
    }

    /// Authenticate with fallback to device passcode
    func authenticateWithPasscode() async -> Bool {
        let context = LAContext()
        var error: NSError?

        // Check if device owner authentication is available (biometric + passcode fallback)
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            await MainActor.run {
                errorMessage = error?.localizedDescription ?? "Authentication not available"
            }
            return false
        }

        let reason = "Unlock Vinho to access your wine cellar"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )

            await MainActor.run {
                if success {
                    unlockApp()
                }
            }

            return success
        } catch {
            await MainActor.run {
                errorMessage = "Authentication failed. Try again."
            }
            return false
        }
    }
}
