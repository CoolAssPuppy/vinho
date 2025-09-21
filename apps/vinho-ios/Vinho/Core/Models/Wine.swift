import Foundation
import SwiftUI

// MARK: - Wine Model
struct Wine: Identifiable, Codable, Hashable {
    let id: UUID
    let producerId: UUID?
    let name: String
    let isNV: Bool
    let createdAt: Date
    var producer: Producer?
    var vintages: [Vintage]?

    enum CodingKeys: String, CodingKey {
        case id
        case producerId = "producer_id"
        case name
        case isNV = "is_nv"
        case createdAt = "created_at"
        case producer
        case vintages
    }

    init(id: UUID = UUID(), name: String, producerId: UUID?, isNV: Bool = false, createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.producerId = producerId
        self.isNV = isNV
        self.createdAt = createdAt
        self.producer = nil
        self.vintages = nil
    }
}

// MARK: - Vintage Model
struct Vintage: Identifiable, Codable, Hashable {
    let id: UUID
    let wineId: UUID?
    let year: Int?
    let abv: Double?
    let vineyardId: UUID?
    let climateZoneId: Int?
    let soilTypeId: Int?
    let createdAt: Date
    var wine: Wine?

    enum CodingKeys: String, CodingKey {
        case id
        case wineId = "wine_id"
        case year
        case abv
        case vineyardId = "vineyard_id"
        case climateZoneId = "climate_zone_id"
        case soilTypeId = "soil_type_id"
        case createdAt = "created_at"
        case wine
    }
}

// MARK: - Producer Model
struct Producer: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let website: String?
    let regionId: UUID?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, website
        case regionId = "region_id"
        case createdAt = "created_at"
    }
}

// MARK: - Scan Model
struct Scan: Identifiable, Codable, Hashable {
    let id: UUID
    let userId: UUID
    let imagePath: String
    let ocrText: String?
    let matchedVintageId: UUID?
    let confidence: Double?
    let createdAt: Date
    let scanImageUrl: String?
    var matchedVintage: Vintage?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case imagePath = "image_path"
        case ocrText = "ocr_text"
        case matchedVintageId = "matched_vintage_id"
        case confidence
        case createdAt = "created_at"
        case scanImageUrl = "scan_image_url"
        case matchedVintage = "matched_vintage"
    }
}

// MARK: - Tasting Model
struct Tasting: Identifiable, Codable, Hashable {
    let id: UUID
    let userId: UUID
    let vintageId: UUID
    let verdict: Int16?
    let notes: String?
    let tastedAt: Date
    let createdAt: Date
    let updatedAt: Date
    var vintage: Vintage?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case vintageId = "vintage_id"
        case verdict
        case notes
        case tastedAt = "tasted_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case vintage
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

// MARK: - Region Model
struct Region: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let country: String?
    let climateZoneId: Int?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, country
        case climateZoneId = "climate_zone_id"
        case createdAt = "created_at"
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