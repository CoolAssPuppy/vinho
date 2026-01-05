import { createClient } from "@/lib/supabase";

export interface WineStats {
  uniqueWines: number;
  totalTastings: number;
  uniqueProducers: number;
  uniqueRegions: number;
  uniqueCountries: number;
  favorites: number;
  averageRating: number | null;
  tastingsLast30Days: number;
  lastTastingDate: string | null;
}

/**
 * Unified stats service for fetching wine statistics
 * Uses the user_wine_stats view for consistency across the app
 */
export class StatsService {
  private supabase = createClient();

  /**
   * Fetch comprehensive wine statistics for the current user
   * Single source of truth for all stats across the application
   */
  async fetchUserStats(): Promise<WineStats | null> {
    try {
      const { data, error } = await this.supabase
        .from("user_wine_stats")
        .select("*")
        .single();

      if (error) throw error;

      return {
        uniqueWines: data.unique_wines || 0,
        totalTastings: data.total_tastings || 0,
        uniqueProducers: data.unique_producers || 0,
        uniqueRegions: data.unique_regions || 0,
        uniqueCountries: data.unique_countries || 0,
        favorites: data.favorites || 0,
        averageRating: data.average_rating,
        tastingsLast30Days: data.tastings_last_30_days || 0,
        lastTastingDate: data.last_tasting_date,
      };
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
      return null;
    }
  }

  /**
   * Get formatted stats for display
   */
  async getDisplayStats() {
    const stats = await this.fetchUserStats();
    if (!stats) return null;

    return {
      wines: {
        value: stats.uniqueWines,
        label: "Wines",
        subtitle: `${stats.totalTastings} tastings`,
      },
      countries: {
        value: stats.uniqueCountries,
        label: "Countries",
        subtitle: `${stats.uniqueRegions} regions`,
      },
      rating: {
        value: stats.averageRating?.toFixed(1) || "0.0",
        label: "Avg Rating",
        subtitle: `${stats.favorites} favorites`,
      },
      recent: {
        value: stats.tastingsLast30Days,
        label: "This Month",
        subtitle: "tastings",
      },
    };
  }
}

// Export singleton instance
export const statsService = new StatsService();
