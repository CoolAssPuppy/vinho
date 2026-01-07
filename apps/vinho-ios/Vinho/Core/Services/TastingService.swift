import Foundation
import Supabase

// MARK: - Debug Logging

#if DEBUG
private func logDecodingError(_ error: DecodingError) {
    switch error {
    case .typeMismatch(let type, let context):
        print("[TastingService] Type mismatch: \(type) at \(context.codingPath)")
    case .valueNotFound(let type, let context):
        print("[TastingService] Value not found: \(type) at \(context.codingPath)")
    case .keyNotFound(let key, let context):
        print("[TastingService] Key not found: \(key) at \(context.codingPath)")
    case .dataCorrupted(let context):
        print("[TastingService] Data corrupted at \(context.codingPath)")
    @unknown default:
        print("[TastingService] Unknown decoding error")
    }
}
#endif

// MARK: - Tasting Service

/// Service responsible for tasting-related operations including CRUD,
/// fetching tastings with sharing info, and paginated queries.
@MainActor
final class TastingService {
    static let shared = TastingService()

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

    // MARK: - Internal Types

    /// Internal type for decoding RPC response with sharing info
    private struct TastingWithSharing: Decodable {
        let id: UUID
        let user_id: UUID
        let vintage_id: UUID
        let verdict: Int?
        let notes: String?
        let detailed_notes: String?
        let tasted_at: String?
        let created_at: String
        let updated_at: String
        let image_url: String?
        let location_name: String?
        let location_address: String?
        let location_city: String?
        let location_latitude: Double?
        let location_longitude: Double?
        let is_shared: Bool
        let sharer_id: UUID?
        let sharer_first_name: String?
        let sharer_last_name: String?

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)

            id = try container.decode(UUID.self, forKey: .id)
            user_id = try container.decode(UUID.self, forKey: .user_id)
            vintage_id = try container.decode(UUID.self, forKey: .vintage_id)
            verdict = try container.decodeIfPresent(Int.self, forKey: .verdict)
            notes = try container.decodeIfPresent(String.self, forKey: .notes)
            detailed_notes = try container.decodeIfPresent(String.self, forKey: .detailed_notes)
            tasted_at = try container.decodeIfPresent(String.self, forKey: .tasted_at)
            created_at = try container.decode(String.self, forKey: .created_at)
            updated_at = try container.decode(String.self, forKey: .updated_at)
            image_url = try container.decodeIfPresent(String.self, forKey: .image_url)
            location_name = try container.decodeIfPresent(String.self, forKey: .location_name)
            location_address = try container.decodeIfPresent(String.self, forKey: .location_address)
            location_city = try container.decodeIfPresent(String.self, forKey: .location_city)

            // Handle NUMERIC types that might be strings or numbers
            if let latString = try? container.decodeIfPresent(String.self, forKey: .location_latitude) {
                location_latitude = Double(latString)
            } else {
                location_latitude = try container.decodeIfPresent(Double.self, forKey: .location_latitude)
            }

            if let lonString = try? container.decodeIfPresent(String.self, forKey: .location_longitude) {
                location_longitude = Double(lonString)
            } else {
                location_longitude = try container.decodeIfPresent(Double.self, forKey: .location_longitude)
            }

            is_shared = try container.decode(Bool.self, forKey: .is_shared)
            sharer_id = try container.decodeIfPresent(UUID.self, forKey: .sharer_id)
            sharer_first_name = try container.decodeIfPresent(String.self, forKey: .sharer_first_name)
            sharer_last_name = try container.decodeIfPresent(String.self, forKey: .sharer_last_name)
        }

        enum CodingKeys: String, CodingKey {
            case id, user_id, vintage_id, verdict, notes, detailed_notes, tasted_at
            case created_at, updated_at, image_url, location_name, location_address
            case location_city, location_latitude, location_longitude, is_shared
            case sharer_id, sharer_first_name, sharer_last_name
        }
    }

    /// Minimal type for extracting just the tasting ID
    private struct TastingIdOnly: Decodable {
        let id: UUID
    }

    // MARK: - Fetch Operations

    /// Fetches all tastings for the current user including shared tastings
    /// - Returns: Array of tastings with full details
    func fetchUserTastings() async throws -> [Tasting] {
        guard (try? await client.auth.session.user.id) != nil else {
            throw TastingServiceError.notAuthenticated
        }

        let response = try await client
            .rpc("get_tastings_with_sharing", params: ["p_limit": 100, "p_offset": 0])
            .execute()

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let tastingsWithSharing = try decoder.decode([TastingWithSharing].self, from: response.data)

        let tastingIds = tastingsWithSharing.map { $0.id.uuidString }

        if tastingIds.isEmpty {
            return []
        }

        let fullResponse: [Tasting] = try await client
            .from("tastings")
            .select(Self.fullTastingQuery)
            .in("id", values: tastingIds)
            .order("created_at", ascending: false)
            .execute()
            .value

        return fullResponse
    }

    /// Fetches tastings for map view with a specified limit
    /// - Parameter limit: Maximum number of tastings to fetch (default: 100)
    /// - Returns: Array of tastings with location data
    func fetchTastingsForMap(limit: Int = 100) async -> [Tasting] {
        guard (try? await client.auth.session.user.id) != nil else {
            return []
        }

        do {
            let response = try await client
                .rpc("get_tastings_with_sharing", params: ["p_limit": limit, "p_offset": 0])
                .execute()

            let decoder = JSONDecoder()
            let tastingsWithSharing = try decoder.decode([TastingIdOnly].self, from: response.data)

            let tastingIds = tastingsWithSharing.map { $0.id.uuidString }

            if tastingIds.isEmpty {
                return []
            }

            let fullResponse: [Tasting] = try await client
                .from("tastings")
                .select(Self.fullTastingQuery)
                .in("id", values: tastingIds)
                .order("tasted_at", ascending: false)
                .execute()
                .value

            return fullResponse
        } catch let decodingError as DecodingError {
            #if DEBUG
            logDecodingError(decodingError)
            #endif
            return []
        } catch {
            #if DEBUG
            print("[TastingService] Failed to fetch tastings for map: \(error.localizedDescription)")
            #endif
            return []
        }
    }

    /// Fetches tastings with pagination support
    /// - Parameters:
    ///   - page: The page number (0-indexed)
    ///   - pageSize: Number of items per page (default: 12)
    /// - Returns: Array of tastings for the specified page
    func fetchUserTastingsPaginated(page: Int, pageSize: Int = 12) async -> [Tasting] {
        guard (try? await client.auth.session.user.id) != nil else {
            return []
        }

        let offset = page * pageSize

        do {
            let response = try await client
                .rpc("get_tastings_with_sharing", params: ["p_limit": pageSize, "p_offset": offset])
                .execute()

            let decoder = JSONDecoder()
            let tastingsWithSharing = try decoder.decode([TastingIdOnly].self, from: response.data)

            let tastingIds = tastingsWithSharing.map { $0.id.uuidString }

            if tastingIds.isEmpty {
                return []
            }

            let fullResponse: [Tasting] = try await client
                .from("tastings")
                .select(Self.fullTastingQuery)
                .in("id", values: tastingIds)
                .order("tasted_at", ascending: false)
                .order("created_at", ascending: false)
                .execute()
                .value

            return fullResponse
        } catch let decodingError as DecodingError {
            #if DEBUG
            logDecodingError(decodingError)
            #endif
            return []
        } catch {
            #if DEBUG
            print("[TastingService] Failed to fetch paginated tastings: \(error.localizedDescription)")
            #endif
            return []
        }
    }

    /// Fetches all tastings for a specific wine
    /// - Parameter wineId: The UUID of the wine
    /// - Returns: Array of tastings for all vintages of the wine
    func fetchTastingsForWine(wineId: UUID) async -> [Tasting] {
        guard (try? await client.auth.session.user.id) != nil else {
            return []
        }

        do {
            struct VintageIdResponse: Decodable {
                let id: UUID
            }

            let vintages: [VintageIdResponse] = try await client
                .from("vintages")
                .select("id")
                .eq("wine_id", value: wineId.uuidString)
                .execute()
                .value

            let vintageIds = vintages.map { $0.id.uuidString }

            guard !vintageIds.isEmpty else {
                return []
            }

            let tastings: [Tasting] = try await client
                .from("tastings")
                .select(Self.fullTastingQuery)
                .in("vintage_id", values: vintageIds)
                .order("tasted_at", ascending: false)
                .execute()
                .value

            return tastings
        } catch {
            #if DEBUG
            print("[TastingService] Failed to fetch wine tastings: \(error.localizedDescription)")
            #endif
            return []
        }
    }

    // MARK: - CRUD Operations

    /// Creates a new tasting record
    /// - Parameters:
    ///   - vintageId: The vintage UUID string
    ///   - verdict: Optional rating (1-5)
    ///   - notes: Optional tasting notes
    ///   - tastedAt: Date the wine was tasted
    /// - Returns: True if successful, false otherwise
    func createTasting(vintageId: String, verdict: Int?, notes: String?, tastedAt: Date) async -> Bool {
        guard let userId = try? await client.auth.session.user.id else { return false }

        let newTasting = Tasting(
            id: UUID(),
            userId: userId,
            vintageId: UUID(uuidString: vintageId) ?? UUID(),
            verdict: verdict,
            notes: notes,
            detailedNotes: nil,
            tastedAt: tastedAt,
            createdAt: Date(),
            updatedAt: Date(),
            imageUrl: nil,
            locationName: nil,
            locationAddress: nil,
            locationCity: nil,
            locationLatitude: nil,
            locationLongitude: nil,
            vintage: nil
        )

        do {
            try await client
                .from("tastings")
                .insert(newTasting)
                .execute()

            notifyTastingDataChanged()
            return true
        } catch {
            #if DEBUG
            print("[TastingService] Failed to create tasting: \(error.localizedDescription)")
            #endif
            return false
        }
    }

    /// Saves a tasting (creates new or updates existing)
    /// - Parameters:
    ///   - id: Optional existing tasting ID for updates
    ///   - vintageId: The vintage UUID
    ///   - verdict: Optional rating (1-5)
    ///   - notes: Optional tasting notes
    ///   - detailedNotes: Optional detailed/technical notes
    ///   - tastedAt: Date the wine was tasted
    ///   - locationName: Optional location name
    ///   - locationAddress: Optional location address
    ///   - locationCity: Optional location city
    ///   - locationLatitude: Optional latitude coordinate
    ///   - locationLongitude: Optional longitude coordinate
    /// - Returns: True if successful, false otherwise
    func saveTasting(
        id: UUID? = nil,
        vintageId: UUID,
        verdict: Int?,
        notes: String?,
        detailedNotes: String?,
        tastedAt: Date,
        locationName: String? = nil,
        locationAddress: String? = nil,
        locationCity: String? = nil,
        locationLatitude: Double? = nil,
        locationLongitude: Double? = nil
    ) async -> Bool {
        guard let userId = try? await client.auth.session.user.id else { return false }

        do {
            if let existingId = id {
                // Update existing
                struct TastingUpdate: Encodable {
                    let verdict: Int?
                    let notes: String?
                    let detailed_notes: String?
                    let updated_at: Date
                    let location_name: String?
                    let location_address: String?
                    let location_city: String?
                    let location_latitude: Double?
                    let location_longitude: Double?
                }

                let updateData = TastingUpdate(
                    verdict: verdict,
                    notes: notes,
                    detailed_notes: detailedNotes,
                    updated_at: Date(),
                    location_name: locationName,
                    location_address: locationAddress,
                    location_city: locationCity,
                    location_latitude: locationLatitude,
                    location_longitude: locationLongitude
                )

                try await client
                    .from("tastings")
                    .update(updateData)
                    .eq("id", value: existingId.uuidString)
                    .execute()
            } else {
                // Create new
                let tasting = Tasting(
                    id: UUID(),
                    userId: userId,
                    vintageId: vintageId,
                    verdict: verdict,
                    notes: notes,
                    detailedNotes: detailedNotes,
                    tastedAt: tastedAt,
                    createdAt: Date(),
                    updatedAt: Date(),
                    imageUrl: nil,
                    locationName: locationName,
                    locationAddress: locationAddress,
                    locationCity: locationCity,
                    locationLatitude: locationLatitude,
                    locationLongitude: locationLongitude,
                    vintage: nil
                )

                try await client
                    .from("tastings")
                    .insert(tasting)
                    .execute()
            }

            notifyTastingDataChanged()
            WineService.shared.notifyWineDataChanged()
            return true
        } catch {
            #if DEBUG
            print("[TastingService] Failed to save tasting: \(error.localizedDescription)")
            #endif
            return false
        }
    }

    /// Deletes a tasting by ID
    /// - Parameter tastingId: The UUID of the tasting to delete
    /// - Returns: True if successful, false otherwise
    func deleteTasting(_ tastingId: UUID) async -> Bool {
        do {
            try await client
                .from("tastings")
                .delete()
                .eq("id", value: tastingId.uuidString)
                .execute()

            notifyTastingDataChanged()
            WineService.shared.notifyWineDataChanged()
            return true
        } catch {
            #if DEBUG
            print("[TastingService] Failed to delete tasting: \(error.localizedDescription)")
            #endif
            return false
        }
    }

    // MARK: - Notifications

    /// Posts notification when tasting data changes to trigger UI updates
    func notifyTastingDataChanged() {
        NotificationCenter.default.post(name: Constants.Notifications.tastingDataChanged, object: nil)
    }
}

// MARK: - Errors

enum TastingServiceError: LocalizedError {
    case notAuthenticated
    case decodingFailed(String)
    case fetchFailed(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated"
        case .decodingFailed(let message):
            return "Failed to decode tastings: \(message)"
        case .fetchFailed(let message):
            return "Failed to fetch tastings: \(message)"
        }
    }
}
