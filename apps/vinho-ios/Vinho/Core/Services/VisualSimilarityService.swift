import Foundation
import Supabase

/// Service for fetching visually similar wine recommendations
actor VisualSimilarityService {
    static let shared = VisualSimilarityService()

    private let baseURL: String

    private init() {
        baseURL = "https://www.vinho.dev"
    }

    private var supabase: SupabaseClient {
        SupabaseManager.shared.client
    }

    /// Result containing both wines and recommendation type
    struct SimilarWinesResult {
        let wines: [SimilarWine]
        let recommendationType: RecommendationType
    }

    /// Fetches wines visually similar to the user's wines
    func fetchSimilarWines(limit: Int = 6) async throws -> SimilarWinesResult {
        print("[SimilarityService] Starting fetch...")

        let session: Session
        do {
            session = try await supabase.auth.session
            print("[SimilarityService] Got auth session for user: \(session.user.id)")
        } catch {
            print("[SimilarityService] Auth error: \(error)")
            throw SimilarityError.notAuthenticated
        }

        guard let url = URL(string: "\(baseURL)/api/wines/similar-for-user?limit=\(limit)") else {
            print("[SimilarityService] Invalid URL: \(baseURL)/api/wines/similar-for-user")
            throw SimilarityError.invalidURL
        }
        print("[SimilarityService] Calling: \(url)")

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            print("[SimilarityService] Invalid response type")
            throw SimilarityError.invalidResponse
        }
        print("[SimilarityService] Got response: \(httpResponse.statusCode)")

        switch httpResponse.statusCode {
        case 200:
            if let responseStr = String(data: data, encoding: .utf8) {
                print("[SimilarityService] Response data: \(responseStr.prefix(500))")
            }
            let result = try JSONDecoder().decode(SimilarWinesResponse.self, from: data)
            print("[SimilarityService] Decoded \(result.similarWines.count) wines")
            return SimilarWinesResult(
                wines: result.similarWines,
                recommendationType: result.recommendationType ?? .yourFavorites
            )
        case 401:
            print("[SimilarityService] 401 Unauthorized")
            throw SimilarityError.notAuthenticated
        default:
            if let responseStr = String(data: data, encoding: .utf8) {
                print("[SimilarityService] Error response (\(httpResponse.statusCode)): \(responseStr)")
                // Try to parse error details
                if let jsonData = responseStr.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                   let details = json["details"] as? String {
                    print("[SimilarityService] Error details: \(details)")
                }
            }
            throw SimilarityError.serverError(httpResponse.statusCode)
        }
    }
}

// MARK: - Models

struct SimilarWine: Codable, Identifiable {
    let wineId: String
    let wineName: String
    let producerName: String
    let similarity: Double
    let imageUrl: String?
    let region: String?
    let country: String?
    let lastTasted: String?

    var id: String { wineId }

    var matchPercentage: Int {
        Int(similarity * 100)
    }

    var locationText: String? {
        guard let region = region else { return country }
        guard let country = country else { return region }
        return "\(region), \(country)"
    }

    var lastTastedFormatted: String? {
        guard let lastTasted = lastTasted else { return nil }
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Try with fractional seconds first
        if let date = isoFormatter.date(from: lastTasted) {
            return formatDate(date)
        }

        // Try without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: lastTasted) {
            return formatDate(date)
        }

        // Try simple date format (YYYY-MM-DD)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        if let date = dateFormatter.date(from: lastTasted) {
            return formatDate(date)
        }

        return nil
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    enum CodingKeys: String, CodingKey {
        case wineId = "wine_id"
        case wineName = "wine_name"
        case producerName = "producer_name"
        case similarity
        case imageUrl = "image_url"
        case region
        case country
        case lastTasted = "last_tasted"
    }
}

enum RecommendationType: String, Codable {
    case personalized
    case yourFavorites = "your_favorites"
    case none

    var title: String {
        switch self {
        case .personalized: return "Suggestions"
        case .yourFavorites: return "Suggestions"
        case .none: return "Suggestions"
        }
    }

    var subtitle: String {
        switch self {
        case .personalized: return "Based on your top-rated wines"
        case .yourFavorites, .none: return "Based on visual similarity"
        }
    }
}

struct SimilarWinesResponse: Codable {
    let similarWines: [SimilarWine]
    let count: Int?
    let basedOnCount: Int?
    let recommendationType: RecommendationType?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case similarWines = "similar_wines"
        case count
        case basedOnCount = "based_on_count"
        case recommendationType = "recommendation_type"
        case message
    }
}

enum SimilarityError: LocalizedError {
    case notAuthenticated
    case invalidURL
    case invalidResponse
    case serverError(Int)
    case decodingError

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Please sign in to see recommendations"
        case .invalidURL:
            return "Unable to connect to recommendations service"
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let code):
            return "Server error (\(code))"
        case .decodingError:
            return "Unable to parse recommendations"
        }
    }
}
