import Foundation
import Supabase

// MARK: - Wine Service

/// Service responsible for wine-related operations including CRUD,
/// fetching wine details, and expert ratings.
@MainActor
final class WineService {
    static let shared = WineService()

    private let client = SupabaseManager.shared.client

    private init() {}

    // MARK: - Wine Queries

    /// Select statement for fetching wines with full details
    private static let wineSelectQuery = "*, producers!producer_id(*, regions(*)), vintages(*)"

    /// Select statement for fetching wines with producer only
    private static let wineWithProducerQuery = "*, producers!producer_id(*)"

    // MARK: - Fetch Operations

    /// Fetches all wines with full details including producers and vintages
    /// - Returns: Array of wines with nested producer and vintage data
    func fetchWines() async throws -> [Wine] {
        let response: [Wine] = try await client
            .from("wines")
            .select(Self.wineSelectQuery)
            .execute()
            .value

        return response
    }

    /// Fetches a single wine with its details
    /// - Parameter wineId: The UUID string of the wine to fetch
    /// - Returns: The wine with details, or nil if not found
    func fetchWineWithDetails(wineId: String) async -> Wine? {
        do {
            let wine: Wine = try await client
                .from("wines")
                .select("*, producers!producer_id(*), vintages(*)")
                .eq("id", value: wineId)
                .single()
                .execute()
                .value

            return wine
        } catch {
            #if DEBUG
            print("[WineService] Failed to fetch wine details: \(error.localizedDescription)")
            #endif
            return nil
        }
    }

    // MARK: - Update Operations

    /// Updates a wine's name and/or description
    /// - Parameters:
    ///   - id: The UUID of the wine to update
    ///   - name: Optional new name for the wine
    ///   - description: Optional new description/tasting notes for the wine
    func updateWine(id: UUID, name: String?, description: String?) async throws {
        struct WineUpdate: Encodable {
            let name: String?
            let tasting_notes: String?
        }

        let updateData = WineUpdate(
            name: name,
            tasting_notes: description
        )

        try await client
            .from("wines")
            .update(updateData)
            .eq("id", value: id.uuidString)
            .execute()

        notifyWineDataChanged()
    }

    // MARK: - Search Operations

    /// Searches for wines by name
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
            print("[WineService] Search failed: \(error.localizedDescription)")
            #endif
            return []
        }
    }

    // MARK: - Expert Ratings

    /// Fetches expert rating for a vintage from external providers
    /// - Parameters:
    ///   - vintageId: The UUID of the vintage to fetch rating for
    ///   - wineName: The wine name for search
    ///   - producerName: The producer name for search
    ///   - year: Optional vintage year
    /// - Returns: ExpertRating if found, nil on error or no rating available
    func fetchExpertRating(
        vintageId: UUID,
        wineName: String,
        producerName: String,
        year: Int? = nil
    ) async -> ExpertRating? {
        do {
            struct ExpertRatingRequest: Encodable {
                let vintageId: String
                let wineName: String
                let producerName: String
                let year: Int?
            }

            let requestBody = ExpertRatingRequest(
                vintageId: vintageId.uuidString,
                wineName: wineName,
                producerName: producerName,
                year: year
            )

            let expertRating: ExpertRating = try await client.functions.invoke(
                "fetch-expert-rating",
                options: FunctionInvokeOptions(body: requestBody)
            )

            return expertRating
        } catch {
            #if DEBUG
            print("[WineService] Failed to fetch expert rating: \(error.localizedDescription)")
            #endif
            return nil
        }
    }

    // MARK: - Notifications

    /// Posts notification when wine data changes to trigger UI updates
    func notifyWineDataChanged() {
        NotificationCenter.default.post(name: Constants.Notifications.wineDataChanged, object: nil)
    }
}
