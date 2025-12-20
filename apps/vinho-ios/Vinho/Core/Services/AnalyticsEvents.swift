import Foundation

/// Type-safe analytics event definitions for Vinho iOS
///
/// Event naming convention: noun_verb (e.g., wine_scanned, tasting_logged)
/// Property naming: snake_case for consistency with PostHog
enum AnalyticsEvent: String {
    // MARK: - Wine Events
    case wineScanned = "wine_scanned"
    case wineViewed = "wine_viewed"
    case wineSearched = "wine_searched"
    case wineShared = "wine_shared"
    case wineAddedToCellar = "wine_added_to_cellar"
    case wineRemovedFromCellar = "wine_removed_from_cellar"
    case similarWinesViewed = "similar_wines_viewed"
    case discoverWineTapped = "discover_wine_tapped"

    // MARK: - Tasting Events
    case tastingStarted = "tasting_started"
    case tastingLogged = "tasting_logged"
    case tastingEdited = "tasting_edited"
    case tastingDeleted = "tasting_deleted"
    case tastingPhotoUploaded = "tasting_photo_uploaded"
    case tastingRatingSubmitted = "tasting_rating_submitted"

    // MARK: - User Journey Events
    case userSignedUp = "user_signed_up"
    case userSignedIn = "user_signed_in"
    case userSignedOut = "user_signed_out"
    case userProfileUpdated = "user_profile_updated"
    case userPreferencesChanged = "user_preferences_changed"
    case userOnboardingStarted = "user_onboarding_started"
    case userOnboardingCompleted = "user_onboarding_completed"
    case userOnboardingSkipped = "user_onboarding_skipped"

    // MARK: - Feature Usage Events
    case mapViewed = "map_viewed"
    case mapRegionSelected = "map_region_selected"
    case journalViewed = "journal_viewed"
    case journalFiltered = "journal_filtered"
    case sharingInviteSent = "sharing_invite_sent"
    case sharingInviteAccepted = "sharing_invite_accepted"
    case exportRequested = "export_requested"

    // MARK: - App Lifecycle Events
    case appOpened = "app_opened"
    case appBackgrounded = "app_backgrounded"

    // MARK: - Error Events
    case scanFailed = "scan_failed"
    case uploadFailed = "upload_failed"
    case apiError = "api_error"

    // MARK: - LLM/AI Events
    case llmOperationStarted = "llm_operation_started"
    case llmOperationCompleted = "llm_operation_completed"
    case llmOperationFailed = "llm_operation_failed"
}

// MARK: - Event Property Types

struct WineScanProperties {
    let scanSource: ScanSource
    let wineIdentified: Bool
    let wineId: String?
    let wineName: String?
    let confidenceScore: Double?

    enum ScanSource: String {
        case camera
        case photoLibrary = "photo_library"
        case manual
    }

    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "scan_source": scanSource.rawValue,
            "wine_identified": wineIdentified
        ]
        if let wineId = wineId { dict["wine_id"] = wineId }
        if let wineName = wineName { dict["wine_name"] = wineName }
        if let confidenceScore = confidenceScore { dict["confidence_score"] = confidenceScore }
        return dict
    }
}

struct TastingLoggedProperties {
    let wineId: String
    let wineName: String
    let rating: Double?
    let hasNotes: Bool
    let hasPhoto: Bool
    let vintage: Int?

    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "wine_id": wineId,
            "wine_name": wineName,
            "has_notes": hasNotes,
            "has_photo": hasPhoto
        ]
        if let rating = rating { dict["rating"] = rating }
        if let vintage = vintage { dict["vintage"] = vintage }
        return dict
    }
}

struct LLMOperationProperties {
    let model: String
    let operation: LLMOperation
    let inputTokens: Int?
    let outputTokens: Int?
    let latencyMs: Int
    let success: Bool
    let errorMessage: String?
    let costEstimateUsd: Double?

    enum LLMOperation: String {
        case embedding
        case completion
        case similarity
        case enrichment
    }

    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "model": model,
            "operation": operation.rawValue,
            "latency_ms": latencyMs,
            "success": success
        ]
        if let inputTokens = inputTokens { dict["input_tokens"] = inputTokens }
        if let outputTokens = outputTokens { dict["output_tokens"] = outputTokens }
        if let errorMessage = errorMessage { dict["error_message"] = errorMessage }
        if let costEstimateUsd = costEstimateUsd { dict["cost_estimate_usd"] = costEstimateUsd }
        return dict
    }
}

struct ErrorProperties {
    let errorMessage: String
    let errorType: String
    let component: String?
    let action: String?

    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "error_message": errorMessage,
            "error_type": errorType
        ]
        if let component = component { dict["component"] = component }
        if let action = action { dict["action"] = action }
        return dict
    }
}
