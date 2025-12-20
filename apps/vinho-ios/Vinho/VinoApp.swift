import SwiftUI

@main
struct VinoApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var themeManager = ThemeManager()
    @StateObject private var hapticManager = HapticManager()
    @StateObject private var deepLinkHandler = DeepLinkHandler()
    @StateObject private var biometricService = BiometricAuthService.shared
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @Environment(\.scenePhase) private var scenePhase

    init() {
        setupAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                ContentView()
                    .preferredColorScheme(.dark)
                    .environmentObject(authManager)
                    .environmentObject(themeManager)
                    .environmentObject(hapticManager)
                    .environmentObject(deepLinkHandler)
                    .environmentObject(biometricService)
                    .onOpenURL { url in
                        Task {
                            let handledAuth = await authManager.handleIncomingURL(url)
                            if !handledAuth {
                                deepLinkHandler.handle(url: url)
                            }
                        }
                    }
                    .task {
                        await authManager.checkSession()
                    }

                // Biometric lock overlay
                if biometricService.isLocked && authManager.isAuthenticated {
                    BiometricLockView(biometricService: biometricService)
                        .transition(.opacity)
                        .zIndex(100)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: biometricService.isLocked)
            .onChange(of: scenePhase) { _, newPhase in
                handleScenePhaseChange(newPhase)
            }
        }
    }

    /// Handle app lifecycle changes for biometric lock
    private func handleScenePhaseChange(_ phase: ScenePhase) {
        switch phase {
        case .background:
            // Lock the app when going to background (if biometric is enabled)
            if authManager.isAuthenticated {
                biometricService.lockApp()
            }
        case .active:
            // App became active - biometric prompt will show automatically
            break
        case .inactive:
            // Transitioning - no action needed
            break
        @unknown default:
            break
        }
    }

    private func setupAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.vinoDark)
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().tintColor = UIColor(Color.vinoAccent)

        // Configure tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(Color.vinoDark)

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        UITabBar.appearance().tintColor = UIColor(Color.vinoAccent)
        UITabBar.appearance().unselectedItemTintColor = UIColor(Color.vinoTextTertiary)
    }
}
