import Foundation
import PostHog

/// PostHog Analytics Service for Vinho iOS
///
/// Provides type-safe analytics tracking with production-only capture.
/// In DEBUG builds, events are logged to console instead of sent to PostHog.
final class AnalyticsService {
    static let shared = AnalyticsService()

    private var isEnabled: Bool {
        #if DEBUG
        return false
        #else
        return true
        #endif
    }

    private init() {}

    // MARK: - Setup

    /// Configure PostHog with API key and host from Doppler secrets.
    /// Call this once at app launch.
    func configure() {
        guard let apiKey = SecretsManager.shared.string(for: "NEXT_PUBLIC_POSTHOG_KEY"),
              !apiKey.isEmpty else {
            print("[Analytics] PostHog API key not found, skipping initialization")
            return
        }

        let host = SecretsManager.shared.string(for: "NEXT_PUBLIC_POSTHOG_HOST") ?? "https://us.i.posthog.com"

        let config = PostHogConfig(apiKey: apiKey, host: host)

        // Enable lifecycle events
        config.captureApplicationLifecycleEvents = true

        // Enable screen views (note: doesn't work with SwiftUI without screenshot mode)
        config.captureScreenViews = false

        // Enable session replay with screenshot mode for SwiftUI
        config.sessionReplay = isEnabled
        config.sessionReplayConfig.screenshotMode = true

        // Preload feature flags for faster access
        config.preloadFeatureFlags = true

        PostHogSDK.shared.setup(config)

        #if DEBUG
        print("[Analytics] PostHog initialized in DEBUG mode (events will be logged, not sent)")
        #else
        print("[Analytics] PostHog initialized in production mode")
        #endif
    }

    // MARK: - User Identification

    /// Identify the current user after authentication.
    /// - Parameters:
    ///   - userId: The unique user identifier (Supabase user ID)
    ///   - properties: Optional user properties to set
    func identify(userId: String, properties: [String: Any]? = nil) {
        if !isEnabled {
            print("[Analytics Dev] identify: \(userId), properties: \(properties ?? [:])")
            return
        }

        if let properties = properties {
            PostHogSDK.shared.identify(userId, userProperties: properties)
        } else {
            PostHogSDK.shared.identify(userId)
        }
    }

    /// Reset the current user identity on logout.
    func reset() {
        if !isEnabled {
            print("[Analytics Dev] reset")
            return
        }

        PostHogSDK.shared.reset()
    }

    // MARK: - Event Capture

    /// Capture an analytics event.
    /// - Parameters:
    ///   - event: The event to capture
    ///   - properties: Optional event properties
    func capture(_ event: AnalyticsEvent, properties: [String: Any]? = nil) {
        if !isEnabled {
            print("[Analytics Dev] \(event.rawValue): \(properties ?? [:])")
            return
        }

        if let properties = properties {
            PostHogSDK.shared.capture(event.rawValue, properties: properties)
        } else {
            PostHogSDK.shared.capture(event.rawValue)
        }
    }

    // MARK: - Convenience Methods

    /// Track a wine scan event
    func trackWineScan(_ properties: WineScanProperties) {
        capture(.wineScanned, properties: properties.dictionary)
    }

    /// Track a tasting logged event
    func trackTastingLogged(_ properties: TastingLoggedProperties) {
        capture(.tastingLogged, properties: properties.dictionary)
    }

    /// Track an LLM operation
    func trackLLMOperation(_ properties: LLMOperationProperties) {
        let event: AnalyticsEvent = properties.success ? .llmOperationCompleted : .llmOperationFailed
        capture(event, properties: properties.dictionary)
    }

    /// Capture an error
    func captureError(_ error: Error, component: String? = nil, action: String? = nil) {
        let properties = ErrorProperties(
            errorMessage: error.localizedDescription,
            errorType: String(describing: type(of: error)),
            component: component,
            action: action
        )

        if !isEnabled {
            print("[Analytics Dev] Error: \(properties.dictionary)")
            return
        }

        PostHogSDK.shared.capture("$exception", properties: [
            "$exception_message": error.localizedDescription,
            "$exception_type": String(describing: type(of: error)),
            "component": component ?? "",
            "action": action ?? ""
        ])
    }

    // MARK: - User Properties

    /// Set a persistent user property
    func setUserProperty(_ property: String, value: Any) {
        if !isEnabled {
            print("[Analytics Dev] setUserProperty: \(property) = \(value)")
            return
        }

        PostHogSDK.shared.identify(
            PostHogSDK.shared.getDistinctId(),
            userProperties: [property: value]
        )
    }

    /// Get the current distinct ID
    func getDistinctId() -> String {
        return PostHogSDK.shared.getDistinctId()
    }
}
