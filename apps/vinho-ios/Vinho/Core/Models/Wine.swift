import Foundation
import SwiftUI

// MARK: - Wine Model
struct Wine: Identifiable, Codable, Hashable {
    let id: String
    let producerId: String
    let name: String
    let description: String?
    let isNV: Bool
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case producerId = "producer_id"
        case name
        case description
        case isNV = "is_nv"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Vintage Model
struct Vintage: Identifiable, Codable, Hashable {
    let id: String
    let wineId: String
    let year: Int
    let alcohol: Double?
    let description: String?
    let servingTemperature: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case wineId = "wine_id"
        case year
        case alcohol
        case description
        case servingTemperature = "serving_temperature"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Producer Model
struct Producer: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let description: String?
    let website: String?
    let instagram: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, description, website, instagram
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Scan Model
struct Scan: Identifiable, Codable, Hashable {
    let id: String
    let userId: String
    let imageUrl: String
    let ocrText: String?
    let matchedVintageId: String?
    let confidence: Double?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case imageUrl = "image_url"
        case ocrText = "ocr_text"
        case matchedVintageId = "matched_vintage_id"
        case confidence
        case createdAt = "created_at"
    }
}

// MARK: - TastingNote Model
struct TastingNote: Identifiable, Codable, Hashable {
    let id: String
    let userId: String
    let vintageId: String
    let rating: Int?
    let notes: String?
    let color: String?
    let nose: String?
    let palate: String?
    let finish: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case vintageId = "vintage_id"
        case rating, notes, color, nose, palate, finish
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - UserProfile Model
struct UserProfile: Identifiable, Codable, Hashable, Equatable {
    let id: UUID
    var email: String?
    var fullName: String?
    var avatarUrl: String?
    var bio: String?
    var winePreferences: [String: String]? // Changed to String: String for Equatable conformance
    let createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, email
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case bio
        case winePreferences = "wine_preferences"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Conform to Equatable
    static func == (lhs: UserProfile, rhs: UserProfile) -> Bool {
        lhs.id == rhs.id
    }

    // Conform to Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    // Custom initializer for creating new profiles
    init(id: UUID, email: String?, fullName: String?, bio: String? = nil, avatarUrl: String? = nil, createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.email = email
        self.fullName = fullName
        self.bio = bio
        self.avatarUrl = avatarUrl
        self.winePreferences = nil
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - WineQueue Model
struct WineQueue: Identifiable, Codable, Hashable {
    let id: String
    let userId: String
    let imageUrl: String
    let ocrText: String?
    let scanId: String?
    let status: QueueStatus
    let processedData: ProcessedWineData?
    let errorMessage: String?
    let retryCount: Int
    let createdAt: Date
    let processedAt: Date?

    enum QueueStatus: String, Codable {
        case pending, processing, completed, failed
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case imageUrl = "image_url"
        case ocrText = "ocr_text"
        case scanId = "scan_id"
        case status
        case processedData = "processed_data"
        case errorMessage = "error_message"
        case retryCount = "retry_count"
        case createdAt = "created_at"
        case processedAt = "processed_at"
    }
}

// MARK: - ProcessedWineData Model
struct ProcessedWineData: Codable, Hashable {
    let wineryName: String
    let wineName: String
    let varietal: String?
    let year: Int?
    let region: String?
    let country: String?
    let confidence: Double

    enum CodingKeys: String, CodingKey {
        case wineryName = "winery_name"
        case wineName = "wine_name"
        case varietal
        case year
        case region
        case country
        case confidence
    }
}