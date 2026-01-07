import Foundation
import Supabase

// MARK: - Search Service

/// Service responsible for search operations including text search
/// and tasting search functionality.
@MainActor
final class SearchService {
    static let shared = SearchService()

    private let client = SupabaseManager.shared.client

    private init() {}

    // MARK: - Query Constants

    /// Full select query for tastings with vintage, wine, and producer details
    private static let fullTastingQuery = """
        *,
        vintages!vintage_id(
            *,
            wines!wine_id(
                *,
                producers!producer_id(*)
            )
        )
    """

    /// Select query for wines with producer info
    private static let wineWithProducerQuery = "*, producers!producer_id(*)"

    // MARK: - Tasting Search

    /// Searches tastings using full-text search
    /// - Parameter query: The search query string
    /// - Returns: Array of matching tastings with full details
    func searchTastings(query: String) async -> [Tasting] {
        guard !query.isEmpty else { return [] }
        guard let userId = try? await client.auth.session.user.id else { return [] }

        do {
            // Use RPC to call the search function
            let response = try await client
                .rpc("search_tastings_text", params: [
                    "query": query,
                    "match_count": "20",
                    "user_id_filter": userId.uuidString
                ])
                .execute()

            // The function returns tasting IDs
            struct SearchResult: Decodable {
                let tasting_id: UUID
            }

            let decoder = JSONDecoder()
            let searchResults = try decoder.decode([SearchResult].self, from: response.data)

            if searchResults.isEmpty {
                return []
            }

            // Fetch the full tasting records
            let tastingIds = searchResults.map { $0.tasting_id.uuidString }
            let tastings: [Tasting] = try await client
                .from("tastings")
                .select(Self.fullTastingQuery)
                .in("id", values: tastingIds)
                .execute()
                .value

            return tastings
        } catch {
            #if DEBUG
            print("[SearchService] Tasting search failed: \(error.localizedDescription)")
            #endif
            return []
        }
    }

    // MARK: - Wine Search

    /// Searches wines by name
    /// - Parameter query: The search query string
    /// - Returns: Array of matching wines with producer information
    func searchWines(query: String) async -> [Wine] {
        guard !query.isEmpty else { return [] }

        do {
            let response: [Wine] = try await client
                .from("wines")
                .select(Self.wineWithProducerQuery)
                .or("name.ilike.%\(query)%")
                .execute()
                .value

            return response
        } catch {
            #if DEBUG
            print("[SearchService] Wine search failed: \(error.localizedDescription)")
            #endif
            return []
        }
    }
}
