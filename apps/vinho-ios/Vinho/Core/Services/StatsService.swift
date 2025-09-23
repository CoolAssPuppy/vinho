import Foundation
import Supabase

// MARK: - Models
struct WineStats: Decodable {
    let uniqueWines: Int
    let totalTastings: Int
    let uniqueProducers: Int
    let uniqueRegions: Int
    let uniqueCountries: Int
    let favorites: Int
    let averageRating: Double?
    let tastingsLast30Days: Int
    let lastTastingDate: Date?

    enum CodingKeys: String, CodingKey {
        case uniqueWines = "unique_wines"
        case totalTastings = "total_tastings"
        case uniqueProducers = "unique_producers"
        case uniqueRegions = "unique_regions"
        case uniqueCountries = "unique_countries"
        case favorites
        case averageRating = "average_rating"
        case tastingsLast30Days = "tastings_last_30_days"
        case lastTastingDate = "last_tasting_date"
    }
}

struct DisplayStats {
    struct StatItem {
        let value: String
        let label: String
        let subtitle: String
    }

    let wines: StatItem
    let countries: StatItem
    let rating: StatItem
    let recent: StatItem
}

// MARK: - Stats Service
/// Unified stats service for fetching wine statistics
/// Uses the user_wine_stats view for consistency across the app
@MainActor
class StatsService: ObservableObject {
    static let shared = StatsService()

    private let client = SupabaseManager.shared.client
    @Published var currentStats: WineStats?
    @Published var isLoading = false

    private init() {}

    /// Fetch comprehensive wine statistics for the current user
    /// Single source of truth for all stats across the application
    func fetchUserStats() async -> WineStats? {
        guard let _ = try? await client.auth.session.user.id else { return nil }

        isLoading = true
        defer { isLoading = false }

        do {
            let stats: WineStats = try await client
                .from("user_wine_stats")
                .select("*")
                .single()
                .execute()
                .value

            currentStats = stats
            return stats
        } catch {
            print("Failed to fetch user stats: \(error.localizedDescription)")
            return nil
        }
    }

    /// Get formatted stats for display
    func getDisplayStats() async -> DisplayStats? {
        let stats = await fetchUserStats()
        guard let stats = stats else { return nil }

        return DisplayStats(
            wines: DisplayStats.StatItem(
                value: "\(stats.uniqueWines)",
                label: "Wines",
                subtitle: "\(stats.totalTastings) tastings"
            ),
            countries: DisplayStats.StatItem(
                value: "\(stats.uniqueCountries)",
                label: "Countries",
                subtitle: "\(stats.uniqueRegions) regions"
            ),
            rating: DisplayStats.StatItem(
                value: String(format: "%.1f", stats.averageRating ?? 0),
                label: "Avg Rating",
                subtitle: "\(stats.favorites) favorites"
            ),
            recent: DisplayStats.StatItem(
                value: "\(stats.tastingsLast30Days)",
                label: "This Month",
                subtitle: "tastings"
            )
        )
    }
}

// MARK: - Convenience Extensions
extension StatsService {
    /// Quick access to key metrics
    var totalWines: Int { currentStats?.uniqueWines ?? 0 }
    var totalTastings: Int { currentStats?.totalTastings ?? 0 }
    var totalRegions: Int { currentStats?.uniqueRegions ?? 0 }
    var totalCountries: Int { currentStats?.uniqueCountries ?? 0 }
    var favoriteCount: Int { currentStats?.favorites ?? 0 }
    var averageRating: Double { currentStats?.averageRating ?? 0 }
    var recentActivity: Int { currentStats?.tastingsLast30Days ?? 0 }
}