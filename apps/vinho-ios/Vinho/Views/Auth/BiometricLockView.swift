//
//  BiometricLockView.swift
//  Vinho
//
//  Lock screen view for biometric authentication
//

import SwiftUI

/// Lock screen view displayed when biometric authentication is enabled
/// Features Face ID / Touch ID authentication with app branding
struct BiometricLockView: View {

    // MARK: - Properties

    @ObservedObject var biometricService: BiometricAuthService
    @State private var logoScale: CGFloat = 0.9
    @State private var logoOpacity: Double = 0.0
    @State private var contentOpacity: Double = 0.0
    @State private var isAuthenticating = false

    // MARK: - Body

    var body: some View {
        ZStack {
            // Background gradient matching app theme
            LinearGradient(
                colors: [
                    Color.vinoDark,
                    Color.vinoPrimary.opacity(0.15),
                    Color.vinoDark
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Floating accent circles
            ZStack {
                Circle()
                    .fill(Color.vinoPrimary.opacity(0.15))
                    .frame(width: 300, height: 300)
                    .blur(radius: 80)
                    .offset(x: -100, y: -200)

                Circle()
                    .fill(Color.vinoAccent.opacity(0.12))
                    .frame(width: 250, height: 250)
                    .blur(radius: 60)
                    .offset(x: 150, y: 100)
            }

            VStack(spacing: 48) {
                Spacer()

                // App icon and branding
                VStack(spacing: 24) {
                    // Wine glass icon
                    ZStack {
                        Circle()
                            .fill(Color.vinoGlass)
                            .frame(width: 120, height: 120)
                            .blur(radius: 20)

                        Image(systemName: "wineglass.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(LinearGradient.vinoGradient)
                    }
                    .opacity(logoOpacity)
                    .scaleEffect(logoScale)

                    // App name
                    Text("Vinho")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.vinoText, Color.vinoAccent],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .opacity(contentOpacity)

                    Text("Your Wine Cellar is Locked")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                        .opacity(contentOpacity)
                }

                Spacer()

                // Biometric icon and unlock button
                VStack(spacing: 24) {
                    // Biometric icon
                    Image(systemName: biometricService.biometricType.iconName)
                        .font(.system(size: 56, weight: .light))
                        .foregroundColor(.vinoText)
                        .opacity(contentOpacity)

                    // Unlock button
                    Button {
                        authenticateWithBiometrics()
                    } label: {
                        HStack(spacing: 12) {
                            if isAuthenticating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.9)
                            } else {
                                Image(systemName: biometricService.biometricType.iconName)
                                    .font(.system(size: 20))
                            }

                            Text("Unlock with \(biometricService.biometricType.displayName)")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(LinearGradient.vinoGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: Color.vinoPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .disabled(isAuthenticating)
                    .opacity(contentOpacity)

                    // Error message
                    if let errorMessage = biometricService.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.vinoError)
                            .multilineTextAlignment(.center)
                            .opacity(contentOpacity)
                    }

                    // Passcode fallback button
                    Button {
                        authenticateWithPasscode()
                    } label: {
                        Text("Use Passcode")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.vinoTextSecondary)
                    }
                    .opacity(contentOpacity)
                    .padding(.top, 8)
                }
                .padding(.horizontal, 48)

                Spacer()
            }
        }
        .onAppear {
            // Animate entrance
            withAnimation(.easeOut(duration: 0.3)) {
                logoOpacity = 1.0
                logoScale = 1.0
            }

            withAnimation(.easeOut(duration: 0.3).delay(0.15)) {
                contentOpacity = 1.0
            }

            // Auto-authenticate on appear
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                authenticateWithBiometrics()
            }
        }
    }

    // MARK: - Private Methods

    private func authenticateWithBiometrics() {
        guard !isAuthenticating else { return }
        isAuthenticating = true

        Task {
            _ = await biometricService.authenticate()
            await MainActor.run {
                isAuthenticating = false
            }
        }
    }

    private func authenticateWithPasscode() {
        guard !isAuthenticating else { return }
        isAuthenticating = true

        Task {
            _ = await biometricService.authenticateWithPasscode()
            await MainActor.run {
                isAuthenticating = false
            }
        }
    }
}

// MARK: - Preview

#Preview {
    BiometricLockView(biometricService: BiometricAuthService.shared)
}
