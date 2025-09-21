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
struct UserProfile: Identifiable, Codable, Hashable {
    let id: String
    let email: String?
    let fullName: String?
    let avatarUrl: String?
    let bio: String?
    let winePreferences: [String: Any]?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, email
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case bio
        case winePreferences = "wine_preferences"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Custom encoding/decoding for dictionary
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(email, forKey: .email)
        try container.encode(fullName, forKey: .fullName)
        try container.encode(avatarUrl, forKey: .avatarUrl)
        try container.encode(bio, forKey: .bio)
        if let prefs = winePreferences {
            let data = try JSONSerialization.data(withJSONObject: prefs)
            try container.encode(data, forKey: .winePreferences)
        }
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        fullName = try container.decodeIfPresent(String.self, forKey: .fullName)
        avatarUrl = try container.decodeIfPresent(String.self, forKey: .avatarUrl)
        bio = try container.decodeIfPresent(String.self, forKey: .bio)
        if let prefsData = try container.decodeIfPresent(Data.self, forKey: .winePreferences) {
            winePreferences = try JSONSerialization.jsonObject(with: prefsData) as? [String: Any]
        } else {
            winePreferences = nil
        }
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
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