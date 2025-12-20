/**
 * Type-safe PostHog event definitions for Vinho
 *
 * Event naming convention: noun_verb (e.g., wine_scanned, tasting_logged)
 * Property naming: snake_case for consistency with PostHog
 */

// Core wine events
export const WINE_EVENTS = {
  WINE_SCANNED: "wine_scanned",
  WINE_VIEWED: "wine_viewed",
  WINE_SEARCHED: "wine_searched",
  WINE_SHARED: "wine_shared",
  WINE_ADDED_TO_CELLAR: "wine_added_to_cellar",
  WINE_REMOVED_FROM_CELLAR: "wine_removed_from_cellar",
  SIMILAR_WINES_VIEWED: "similar_wines_viewed",
  DISCOVER_WINE_TAPPED: "discover_wine_tapped",
} as const;

// Tasting events
export const TASTING_EVENTS = {
  TASTING_STARTED: "tasting_started",
  TASTING_LOGGED: "tasting_logged",
  TASTING_EDITED: "tasting_edited",
  TASTING_DELETED: "tasting_deleted",
  TASTING_PHOTO_UPLOADED: "tasting_photo_uploaded",
  TASTING_RATING_SUBMITTED: "tasting_rating_submitted",
} as const;

// User journey events
export const USER_EVENTS = {
  USER_SIGNED_UP: "user_signed_up",
  USER_SIGNED_IN: "user_signed_in",
  USER_SIGNED_OUT: "user_signed_out",
  USER_PROFILE_UPDATED: "user_profile_updated",
  USER_PREFERENCES_CHANGED: "user_preferences_changed",
  USER_ONBOARDING_STARTED: "user_onboarding_started",
  USER_ONBOARDING_COMPLETED: "user_onboarding_completed",
  USER_ONBOARDING_SKIPPED: "user_onboarding_skipped",
} as const;

// Feature usage events
export const FEATURE_EVENTS = {
  MAP_VIEWED: "map_viewed",
  MAP_REGION_SELECTED: "map_region_selected",
  JOURNAL_VIEWED: "journal_viewed",
  JOURNAL_FILTERED: "journal_filtered",
  SHARING_INVITE_SENT: "sharing_invite_sent",
  SHARING_INVITE_ACCEPTED: "sharing_invite_accepted",
  EXPORT_REQUESTED: "export_requested",
} as const;

// Error events
export const ERROR_EVENTS = {
  ERROR_OCCURRED: "$exception",
  SCAN_FAILED: "scan_failed",
  UPLOAD_FAILED: "upload_failed",
  API_ERROR: "api_error",
} as const;

// LLM/AI observability events
export const LLM_EVENTS = {
  LLM_OPERATION_STARTED: "llm_operation_started",
  LLM_OPERATION_COMPLETED: "llm_operation_completed",
  LLM_OPERATION_FAILED: "llm_operation_failed",
} as const;

// All events combined for type checking
export const ANALYTICS_EVENTS = {
  ...WINE_EVENTS,
  ...TASTING_EVENTS,
  ...USER_EVENTS,
  ...FEATURE_EVENTS,
  ...ERROR_EVENTS,
  ...LLM_EVENTS,
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// Event property types for type-safe tracking
export interface WineScanProperties {
  scan_source: "camera" | "photo_library" | "manual";
  wine_identified: boolean;
  wine_id?: string;
  wine_name?: string;
  confidence_score?: number;
}

export interface TastingLoggedProperties {
  wine_id: string;
  wine_name: string;
  rating?: number;
  has_notes: boolean;
  has_photo: boolean;
  vintage?: number;
}

export interface WineSearchProperties {
  query: string;
  results_count: number;
  search_type: "text" | "voice" | "filter";
  filters_applied?: string[];
}

export interface LLMOperationProperties {
  model: string;
  operation: "embedding" | "completion" | "similarity" | "enrichment";
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
  success: boolean;
  error_message?: string;
  cost_estimate_usd?: number;
}

export interface ErrorProperties {
  error_message: string;
  error_stack?: string;
  error_type: string;
  component?: string;
  action?: string;
}
