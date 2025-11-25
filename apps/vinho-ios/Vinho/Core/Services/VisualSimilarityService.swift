import Foundation
import Supabase

/// Service for fetching visually similar wine recommendations
actor VisualSimilarityService {
    static let shared = VisualSimilarityService()

    private let baseURL: String
    private let supabase = SupabaseManager.shared.client

    private init() {
        #if DEBUG
        baseURL = "http://localhost:3000"
        #else
        baseURL = "https://app.vinho.dev"
        #endif
    }

    /// Result containing both wines and recommendation type
    struct SimilarWinesResult {
        let wines: [SimilarWine]
        let recommendationType: RecommendationType
    }

    /// Fetches wines visually similar to the user's wines
    func fetchSimilarWines(limit: Int = 6) async throws -> SimilarWinesResult {
        guard let session = try? await supabase.auth.session else {
            throw SimilarityError.notAuthenticated
        }

        guard let url = URL(string: "\(baseURL)/api/wines/similar-for-user?limit=\(limit)") else {
            throw SimilarityError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw SimilarityError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200:
            let result = try JSONDecoder().decode(SimilarWinesResponse.self, from: data)
            return SimilarWinesResult(
                wines: result.similarWines,
                recommendationType: result.recommendationType ?? .yourFavorites
            )
        case 401:
            throw SimilarityError.notAuthenticated
        default:
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

    var id: String { wineId }

    var matchPercentage: Int {
        Int(similarity * 100)
    }

    var locationText: String? {
        guard let region = region else { return country }
        guard let country = country else { return region }
        return "\(region), \(country)"
    }

    enum CodingKeys: String, CodingKey {
        case wineId = "wine_id"
        case wineName = "wine_name"
        case producerName = "producer_name"
        case similarity
        case imageUrl = "image_url"
        case region
        case country
    }
}

enum RecommendationType: String, Codable {
    case personalized
    case yourFavorites = "your_favorites"
    case none

    var title: String {
        switch self {
        case .personalized: return "You Might Like These"
        case .yourFavorites: return "Similar to Your Favorites"
        case .none: return "Recommendations"
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
