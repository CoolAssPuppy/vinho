import Foundation

/// App-wide constants
enum Constants {
    // MARK: - URLs

    enum URLs {
        static let vinhoWeb = URL(string: "https://vinho.dev")!
        static let vinhoWWW = URL(string: "https://www.vinho.dev")!
        static let termsOfService = URL(string: "https://www.strategicnerds.com/terms")!
        static let privacyPolicy = URL(string: "https://www.strategicnerds.com/privacy")!
        static let picksAndShovels = URL(string: "https://www.picksandshovels.dev")!
        static let strategicNerds = URL(string: "https://www.strategicnerds.com")!
        static let supportEmail = URL(string: "mailto:hello@strategicnerds.com")!

        // App Store
        static let appStoreReview = URL(string: "https://apps.apple.com/app/id1234567890?action=write-review")!

        // External APIs
        static let googlePlacesAutocomplete = URL(string: "https://places.googleapis.com/v1/places:autocomplete")!

        static func googlePlaceDetails(placeId: String) -> URL {
            URL(string: "https://places.googleapis.com/v1/places/\(placeId)")!
        }

        // PostHog default host
        static let posthogDefaultHost = "https://us.i.posthog.com"
    }

    // MARK: - App Info

    enum App {
        static let name = "Vinho"
        static let bundleId = "dev.vinho.app"
        static let urlScheme = "vinho"
    }

    // MARK: - Storage Keys

    enum UserDefaultsKeys {
        static let pendingInviteCode = "pending_invite_code"
        static let biometricEnabled = "biometric_enabled"
    }

    // MARK: - Notification Names

    enum Notifications {
        static let wineDataChanged = Notification.Name("WineDataChanged")
        static let tastingDataChanged = Notification.Name("TastingDataChanged")
    }

    // MARK: - Timeouts

    enum Timeouts {
        static let toastDuration: UInt64 = 300_000_000 // 0.3 seconds in nanoseconds
        static let alertDismissDelay: UInt64 = 2_000_000_000 // 2 seconds in nanoseconds
        static let pollingInterval: Double = 1.0 // seconds
    }

    // MARK: - Pagination

    enum Pagination {
        static let defaultPageSize = 12
        static let mapTastingsLimit = 100
    }
}
