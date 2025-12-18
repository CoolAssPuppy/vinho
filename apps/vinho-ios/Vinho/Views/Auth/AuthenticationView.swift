import SwiftUI

struct AuthenticationView: View {
    @StateObject private var viewModel = AuthenticationViewModel()
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @State private var isShowingSignUp = false
    @State private var backgroundPulse = false

    var body: some View {
        NavigationView {
            ZStack {
                // Background
                backgroundGradient
                floatingAccents

                ScrollView {
                    VStack(spacing: 32) {
                        // Logo and Welcome
                        headerSection

                        VStack(spacing: 20) {
                            // Auth Form
                            if isShowingSignUp {
                                SignUpFormView(viewModel: viewModel)
                                    .environmentObject(authManager)
                                    .environmentObject(hapticManager)
                            } else {
                                SignInFormView(viewModel: viewModel)
                                    .environmentObject(authManager)
                                    .environmentObject(hapticManager)
                            }
                        }
                        .padding(24)
                        .background(
                            RoundedRectangle(cornerRadius: 28, style: .continuous)
                                .fill(Color.vinoDarkSecondary.opacity(0.85))
                                .overlay(
                                    LinearGradient(
                                        colors: [Color.vinoPrimary.opacity(0.2), Color.clear, Color.vinoAccent.opacity(0.15)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                    .blur(radius: 20)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                                        .stroke(Color.vinoBorder.opacity(0.6), lineWidth: 1)
                                )
                                .shadow(color: Color.black.opacity(0.25), radius: 20, x: 0, y: 10)
                        )

                        // Toggle Auth Mode
                        toggleAuthButton

                        // Social Login
                        socialLoginSection
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 40)
                }
            }
            .navigationBarHidden(true)
        }
    }

    var backgroundGradient: some View {
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
    }

    var floatingAccents: some View {
        ZStack {
            Circle()
                .fill(Color.vinoPrimary.opacity(0.18))
                .frame(width: 380, height: 380)
                .blur(radius: 80)
                .offset(x: -160, y: -250)
                .scaleEffect(backgroundPulse ? 1.05 : 0.95)

            Circle()
                .fill(Color.vinoAccent.opacity(0.18))
                .frame(width: 320, height: 320)
                .blur(radius: 70)
                .offset(x: 180, y: -180)
                .scaleEffect(backgroundPulse ? 0.96 : 1.04)

            LinearGradient(
                colors: [Color.white.opacity(0.05), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 120)
            .blur(radius: 40)
            .offset(y: -200)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                backgroundPulse.toggle()
            }
        }
    }

    var headerSection: some View {
        VStack(spacing: 16) {
            // Animated Wine Glass
            ZStack {
                Circle()
                    .fill(Color.vinoGlass)
                    .frame(width: 120, height: 120)
                    .blur(radius: 20)

                Image(systemName: "wineglass.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(LinearGradient.vinoGradient)
                    .rotationEffect(.degrees(viewModel.iconRotation))
                    .onAppear {
                        withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                            viewModel.iconRotation = 15
                        }
                    }
            }

            Text("Welcome to Vinho")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.vinoText, Color.vinoAccent],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text("Your Personal Wine Journey Awaits")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)

            Text("Elevated wines, effortless sign in")
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(.vinoTextSecondary)
        }
    }

    var toggleAuthButton: some View {
        Button {
            hapticManager.lightImpact()
            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                isShowingSignUp.toggle()
            }
        } label: {
            HStack {
                Text(isShowingSignUp ? "Already have an account?" : "Don't have an account?")
                    .foregroundColor(.vinoTextSecondary)

                Text(isShowingSignUp ? "Sign In" : "Sign Up")
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
            }
            .font(.system(size: 14))
        }
    }

    var socialLoginSection: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                Rectangle()
                    .fill(Color.vinoTextTertiary.opacity(0.3))
                    .frame(height: 1)

                Text("OR")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.vinoTextSecondary)

                Rectangle()
                    .fill(Color.vinoTextTertiary.opacity(0.3))
                    .frame(height: 1)
            }

            VStack(spacing: 12) {
                Text("Continue with your favorite account")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.vinoText)

                Text("We request only your name and email to create your cellar.")
                    .font(.system(size: 12))
                    .foregroundColor(.vinoTextSecondary)

                HStack(spacing: 18) {
                    SocialLoginButton(
                        icon: "applelogo",
                        fallbackText: nil,
                        title: "Apple",
                        gradient: LinearGradient(
                            colors: [Color.white.opacity(0.2), Color.vinoDarkSecondary],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        foregroundColor: .white,
                        isDisabled: authManager.isLoading,
                        action: {
                            hapticManager.mediumImpact()
                            Task {
                                await authManager.signInWithOAuth(provider: .apple)
                                if authManager.isAuthenticated {
                                    hapticManager.success()
                                }
                            }
                        }
                    )

                    SocialLoginButton(
                        icon: nil,
                        fallbackText: "G",
                        title: "Google",
                        gradient: LinearGradient(
                            colors: [Color(red: 0.98, green: 0.32, blue: 0.25), Color(red: 0.16, green: 0.42, blue: 0.86)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        foregroundColor: .white,
                        isDisabled: authManager.isLoading,
                        action: {
                            hapticManager.mediumImpact()
                            Task {
                                await authManager.signInWithOAuth(provider: .google)
                                if authManager.isAuthenticated {
                                    hapticManager.success()
                                }
                            }
                        }
                    )

                    SocialLoginButton(
                        icon: nil,
                        fallbackText: "f",
                        title: "Facebook",
                        gradient: LinearGradient(
                            colors: [Color(red: 0.18, green: 0.31, blue: 0.72), Color(red: 0.13, green: 0.23, blue: 0.55)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        foregroundColor: .white,
                        isDisabled: authManager.isLoading,
                        action: {
                            hapticManager.mediumImpact()
                            Task {
                                await authManager.signInWithOAuth(provider: .facebook)
                                if authManager.isAuthenticated {
                                    hapticManager.success()
                                }
                            }
                        }
                    )
                }
            }
        }
        .padding(.top, 20)
    }
}

// MARK: - Sign In Form
struct SignInFormView: View {
    @ObservedObject var viewModel: AuthenticationViewModel
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @FocusState private var focusedField: Field?

    enum Field {
        case email, password
    }

    var body: some View {
        VStack(spacing: 20) {
            // Email Field
            CustomTextField(
                icon: "envelope.fill",
                placeholder: "Email",
                text: $viewModel.email,
                keyboardType: .emailAddress,
                isSecure: false
            )
            .focused($focusedField, equals: .email)

            // Password Field
            CustomTextField(
                icon: "lock.fill",
                placeholder: "Password",
                text: $viewModel.password,
                keyboardType: .default,
                isSecure: true
            )
            .focused($focusedField, equals: .password)

            // Forgot Password
            HStack {
                Spacer()
                Button("Forgot Password?") {
                    hapticManager.lightImpact()
                    // Handle forgot password
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoAccent)
            }

            // Sign In Button
            PrimaryButton(
                title: "Sign In",
                isLoading: authManager.isLoading,
                action: {
                    hapticManager.mediumImpact()
                    Task {
                        await authManager.signIn(
                            email: viewModel.email,
                            password: viewModel.password
                        )
                        if authManager.isAuthenticated {
                            hapticManager.success()
                        } else {
                            hapticManager.error()
                        }
                    }
                }
            )

            // Error Message
            if let error = authManager.errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.vinoError)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

// MARK: - Sign Up Form
struct SignUpFormView: View {
    @ObservedObject var viewModel: AuthenticationViewModel
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var hapticManager: HapticManager
    @FocusState private var focusedField: Field?

    enum Field {
        case name, email, password
    }

    var body: some View {
        VStack(spacing: 20) {
            // Name Field
            CustomTextField(
                icon: "person.fill",
                placeholder: "Full Name",
                text: $viewModel.fullName,
                keyboardType: .default,
                isSecure: false
            )
            .focused($focusedField, equals: .name)

            // Email Field
            CustomTextField(
                icon: "envelope.fill",
                placeholder: "Email",
                text: $viewModel.email,
                keyboardType: .emailAddress,
                isSecure: false
            )
            .focused($focusedField, equals: .email)

            // Password Field
            CustomTextField(
                icon: "lock.fill",
                placeholder: "Password",
                text: $viewModel.password,
                keyboardType: .default,
                isSecure: true
            )
            .focused($focusedField, equals: .password)

            // Password Requirements
            VStack(alignment: .leading, spacing: 8) {
                PasswordRequirement(
                    text: "At least 8 characters",
                    isMet: viewModel.password.count >= 8
                )
                PasswordRequirement(
                    text: "Contains uppercase letter",
                    isMet: viewModel.password.rangeOfCharacter(from: .uppercaseLetters) != nil
                )
                PasswordRequirement(
                    text: "Contains number",
                    isMet: viewModel.password.rangeOfCharacter(from: .decimalDigits) != nil
                )
            }
            .padding(.horizontal, 4)

            // Sign Up Button
            PrimaryButton(
                title: "Create Account",
                isLoading: authManager.isLoading,
                action: {
                    hapticManager.mediumImpact()
                    Task {
                        await authManager.signUp(
                            email: viewModel.email,
                            password: viewModel.password,
                            fullName: viewModel.fullName
                        )
                        if authManager.isAuthenticated {
                            hapticManager.success()
                        } else {
                            hapticManager.error()
                        }
                    }
                }
            )

            // Error Message
            if let error = authManager.errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.vinoError)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

// MARK: - View Model
class AuthenticationViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var fullName = ""
    @Published var iconRotation: Double = 0
}

// MARK: - Custom Components
struct CustomTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    let keyboardType: UIKeyboardType
    let isSecure: Bool
    @State private var isShowingPassword = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.vinoTextSecondary)
                .frame(width: 24)

            if isSecure && !isShowingPassword {
                SecureField(placeholder, text: $text)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                    .keyboardType(keyboardType)
                    .textContentType(.password)
            } else {
                TextField(placeholder, text: $text)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                    .keyboardType(keyboardType)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
            }

            if isSecure {
                Button {
                    isShowingPassword.toggle()
                } label: {
                    Image(systemName: isShowingPassword ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.vinoTextSecondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
    }
}

struct PrimaryButton: View {
    let title: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(LinearGradient.vinoGradient)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: Color.vinoPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
        }
        .disabled(isLoading)
        .scaleEffect(isLoading ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }
}

struct SocialLoginButton: View {
    let icon: String?
    let fallbackText: String?
    let title: String
    let gradient: LinearGradient
    let foregroundColor: Color
    let action: () -> Void
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(gradient)
                    .frame(width: 58, height: 58)
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 6)

                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(foregroundColor)
                } else if let fallbackText {
                    Text(fallbackText)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundColor(foregroundColor)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("Sign in with \(title)"))
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.6 : 1)
    }
}

struct PasswordRequirement: View {
    let text: String
    let isMet: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 12))
                .foregroundColor(isMet ? .vinoSuccess : .vinoTextTertiary)

            Text(text)
                .font(.system(size: 12))
                .foregroundColor(isMet ? .vinoTextSecondary : .vinoTextTertiary)
        }
    }
}
