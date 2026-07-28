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
        static let appStoreReview = URL(string: "https://apps.apple.com/app/id\(App.appStoreId)?action=write-review")!

        // External APIs
        static let googlePlacesAutocomplete = URL(string: "https://places.googleapis.com/v1/places:autocomplete")!

        /// Percent-encodes the place id before interpolating it into the path.
        /// Returns nil rather than force-unwrapping so a malformed id surfaces as
        /// a thrown error at the call site instead of a crash.
        static func googlePlaceDetails(placeId: String) -> URL? {
            guard let encoded = placeId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
                  !encoded.isEmpty else {
                return nil
            }
            return URL(string: "https://places.googleapis.com/v1/places/\(encoded)")
        }

        // PostHog default host
        static let posthogDefaultHost = "https://us.i.posthog.com"
    }

    // MARK: - App Info

    enum App {
        static let name = "Vinho"
        static let bundleId = "dev.vinho.app"
        static let urlScheme = "vinho"
        /// App Store Connect app id (matches ASC_APP_ID in Doppler).
        static let appStoreId = "6752897537"
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
