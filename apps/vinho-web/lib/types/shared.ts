/**
 * Shared APPLICATION-LEVEL type definitions used across the application
 *
 * IMPORTANT DISTINCTION:
 * - /lib/database.types.ts = Auto-generated Supabase/PostgREST types (raw database tables)
 * - /lib/types/shared.ts = Application types representing data AFTER queries with joins
 *
 * These types represent the actual shape of data returned from Supabase queries
 * that include relations/joins via the select() method. They do NOT represent
 * the raw database table structure.
 *
 * Example:
 * - Database: tastings table has `vintage_id: string`
 * - Application: Tasting type has `vintage: { wine: { producer: {...} } }`
 *
 * When possible, these types should extend or reference the base database types
 * from /lib/database.types.ts for consistency.
 */

import type { Database } from "@/lib/database.types";

// Type aliases for commonly used database types
type DbTasting = Database["public"]["Tables"]["tastings"]["Row"];
type DbVintage = Database["public"]["Tables"]["vintages"]["Row"];
type DbWine = Database["public"]["Tables"]["wines"]["Row"];
type DbProducer = Database["public"]["Tables"]["producers"]["Row"];
type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbQueueItem = Database["public"]["Tables"]["wines_added_queue"]["Row"];

// ============= Wine & Tasting Types =============

/**
 * Tasting with nested relations as returned by queries with joins
 * Example query:
 * .from("tastings").select(`
 *   *,
 *   vintage:vintage_id (
 *     year,
 *     wine:wine_id (
 *       name,
 *       producer:producer_id (name, city)
 *     )
 *   )
 * `)
 *
 * Note: Some fields are optional as search results may not include all fields
 */
export interface Tasting {
  id: string;
  verdict: number | null;
  notes: string | null;
  detailed_notes: string | null;
  tasted_at: string;
  location_name?: string | null;
  location_address?: string | null;
  location_city?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  image_url?: string | null;
  is_shared?: boolean;
  sharer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  vintage: {
    id: string;
    year: number | null;
    wine: {
      name: string;
      producer: {
        name: string;
        city?: string | null;
      };
    };
  };
}

export interface WineLocation {
  id: string;
  name: string;
  producer: string;
  producer_address?: string | null;
  producer_city?: string | null;
  producer_website?: string | null;
  region: string;
  country: string;
  year: number | null;
  varietals: string[];
  latitude: number | null;
  longitude: number | null;
  vineyard_name: string | null;
  tasted_location?: string | null;
  tasted_date?: Date;
}

export interface WineRecommendation {
  wine_name: string;
  producer: string;
  region: string;
  varietals: string[];
  vintage_year: number | null;
  reasoning: string;
}

// ============= Profile & User Types =============

/**
 * Form data for profile editing (splits full name into first/last)
 * This is a UI-specific type, not directly from database
 */
export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  description: string;
}

/**
 * Profile stats for display - simplified from user_wine_stats view
 * Maps from database view columns to UI-friendly names
 */
export interface ProfileStats {
  wines: number;      // from unique_wines
  notes: number;      // from total_tastings
  regions: number;    // from unique_regions
  favorites: number;  // from favorites
}

/**
 * User profile subset - commonly needed fields from profiles table
 * Consider using DbProfile directly when all fields are needed
 */
export interface UserProfile extends Pick<DbProfile, 'description' | 'avatar_url'> {
  full_name: string | null;  // Computed from first_name + last_name in some contexts
}

// ============= Stats & Analytics Types =============

/**
 * Wine statistics from user_wine_stats view
 * This matches the materialized view structure but makes some fields optional
 * since not all queries return all fields
 */
export type WineStats = Database["public"]["Views"]["user_wine_stats"]["Row"];

// ============= Scan & Processing Types =============

/**
 * UI state for wine label scanning workflow
 */
export type ScanStatus = "idle" | "uploading" | "processing" | "completed" | "error";

/**
 * Result of OCR scanning operation
 * Contains queue item reference and extracted wine data
 */
export interface ScanResult {
  scanId?: string;
  queueItemId?: string;
  message?: string;
  wineData?: {
    wine_name: string;
    producer_name: string;
    region?: string;
    country?: string;
    vintage_year?: number;
    grape_varietals?: string[];
  } | unknown | null;
  error?: string;
}

// ============= Recent Wine Types =============

/**
 * Flattened wine data for recent wines display
 * This is a denormalized view combining data from tastings, vintages, wines, and producers
 * Used in map and journal views where we need all wine info in a flat structure
 */
export interface RecentWine {
  id: string;
  wine_name: string;
  producer_name: string;
  region: string;
  country: string;
  vintage_year: number | null | undefined;
  vintage_id: string | undefined;
  abv: number | null | undefined;
  rating: number | null | undefined;  // Alias for verdict
  tasted_at: string | null;
  location_name: string | null | undefined;
  location_address: string | null | undefined;
  location_city: string | null | undefined;
  location_latitude: number | null | undefined;
  location_longitude: number | null | undefined;
  notes: string | null | undefined;
  detailed_notes: string | null | undefined;
  is_shared?: boolean;
  sharer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// ============= Wine Preferences Types =============

/**
 * User's wine preferences stored in profiles table
 * These are stored as JSONB columns in the database
 */
export interface WinePreferences {
  wine_types: string[];
  favorite_regions: string[];
  favorite_varietals: string[];
  favorite_styles: string[];
  price_range: { low: number; high: number };
  tasting_note_style: string;
  // Legacy fields for backward compatibility
  favoriteTypes?: string[];
  favoriteRegions?: string[];
  priceRange?: [number, number];
  flavorProfile?: string[];
  avoidTypes?: string[];
}

// ============= Migration Types =============

/**
 * Result of a Vivino CSV migration operation
 * This is an API response type, not directly from database
 */
export interface MigrationResult {
  success: boolean;
  imported?: number;  // Some use imported
  importedCount?: number;  // Others use importedCount
  failed?: number;  // Some use failed
  failedCount?: number;  // Others use failedCount
  wines?: Array<{
    wine_name: string;
    producer_name: string;
    vintage_year?: number;
    status: "success" | "failed";
    error?: string;
  }>;
  message?: string;
  errors?: string[];
  details?: {
    producers: number;
    wines: number;
    vintages: number;
    tastings: number;
  };
}

// ============= Queue Status Types =============

/**
 * Aggregated status of wine processing queue
 * Computed from wines_added_queue table with counts and recent items
 */
export interface QueueStatus {
  pending: number;
  working: number;
  completed: number;
  failed: number;
  total: number;
  isProcessing: boolean;
  recentlyCompleted: Array<{
    wine_name: string;
    producer_name: string;
    completed_at: string;
  }>;
  errors: Array<{
    wine_name: string;
    producer_name: string;
    error_message: string;
  }>;
}

// ============= Tasting Style Types =============

/**
 * Tasting note style preference stored in profiles.tasting_note_style
 */
export type TastingStyle = "casual" | "sommelier" | "winemaker" | null;