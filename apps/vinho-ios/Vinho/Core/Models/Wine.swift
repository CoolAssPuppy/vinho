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
        case producer = "producers"
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
        case wine = "wines"
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
        case matchedVintage = "vintages"
    }
}

// MARK: - Tasting Model
struct Tasting: Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    let vintageId: UUID
    let verdict: Int?  // Changed from Int16? to Int? for 1-5 star rating
    let notes: String?
    let detailedNotes: String?  // Added for technical notes
    let tastedAt: Date
    let createdAt: Date
    let updatedAt: Date
    let imageUrl: String?  // URL of the wine bottle image
    var vintage: Vintage?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case vintageId = "vintage_id"
        case verdict
        case notes
        case detailedNotes = "detailed_notes"
        case tastedAt = "tasted_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case imageUrl = "image_url"
        case vintage = "vintages"
    }
}

// MARK: - Tasting Codable Implementation
extension Tasting: Codable {
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(UUID.self, forKey: .id)
        userId = try container.decode(UUID.self, forKey: .userId)
        vintageId = try container.decode(UUID.self, forKey: .vintageId)
        verdict = try container.decodeIfPresent(Int.self, forKey: .verdict)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        detailedNotes = try container.decodeIfPresent(String.self, forKey: .detailedNotes)
        imageUrl = try container.decodeIfPresent(String.self, forKey: .imageUrl)
        vintage = try container.decodeIfPresent(Vintage.self, forKey: .vintage)

        // Handle date-only format for tastedAt
        if let dateString = try? container.decode(String.self, forKey: .tastedAt) {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            tastedAt = dateFormatter.date(from: dateString) ?? Date()
        } else {
            tastedAt = try container.decode(Date.self, forKey: .tastedAt)
        }

        // Handle ISO8601 format for timestamps
        if let dateString = try? container.decode(String.self, forKey: .createdAt) {
            let dateFormatter = ISO8601DateFormatter()
            createdAt = dateFormatter.date(from: dateString) ?? Date()
        } else {
            createdAt = try container.decode(Date.self, forKey: .createdAt)
        }

        if let dateString = try? container.decode(String.self, forKey: .updatedAt) {
            let dateFormatter = ISO8601DateFormatter()
            updatedAt = dateFormatter.date(from: dateString) ?? Date()
        } else {
            updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(vintageId, forKey: .vintageId)
        try container.encodeIfPresent(verdict, forKey: .verdict)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(detailedNotes, forKey: .detailedNotes)
        try container.encodeIfPresent(imageUrl, forKey: .imageUrl)
        try container.encodeIfPresent(vintage, forKey: .vintage)
        try container.encode(tastedAt, forKey: .tastedAt)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - PriceRange Model
struct PriceRange: Codable, Hashable, Equatable {
    let low: Int
    let high: Int
    
    init(low: Int = 20, high: Int = 100) {
        self.low = low
        self.high = high
    }
}

// MARK: - WinePreferences Model
struct WinePreferences: Codable, Hashable, Equatable {
    let wineTypes: [String]?
    let priceRange: [Int]?
    let collectBottles: Bool?
    let tastingNoteStyle: String?
    
    enum CodingKeys: String, CodingKey {
        case wineTypes = "wine_types"
        case priceRange = "price_range"
        case collectBottles = "collect_bottles"
        case tastingNoteStyle = "tasting_note_style"
    }
    
    init(wineTypes: [String]? = nil, priceRange: [Int]? = nil, collectBottles: Bool? = nil, tastingNoteStyle: String? = nil) {
        self.wineTypes = wineTypes
        self.priceRange = priceRange
        self.collectBottles = collectBottles
        self.tastingNoteStyle = tastingNoteStyle
    }
}

// MARK: - UserProfile Model
struct UserProfile: Identifiable, Codable, Hashable, Equatable {
    var id: UUID
    var email: String? // This comes from auth.users table
    var firstName: String?
    var lastName: String?
    var avatarUrl: String?
    var description: String? // This maps to the 'description' column in the database
    var winePreferences: WinePreferences?
    var favoriteRegions: [String]?
    var favoriteVarietals: [String]?
    var favoriteStyles: [String]?
    var priceRange: PriceRange?
    var tastingNoteStyle: String?
    let createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case description
        case winePreferences = "wine_preferences"
        case favoriteRegions = "favorite_regions"
        case favoriteVarietals = "favorite_varietals"
        case favoriteStyles = "favorite_styles"
        case priceRange = "price_range"
        case tastingNoteStyle = "tasting_note_style"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Computed property for full name
    var fullName: String? {
        if let firstName = firstName, let lastName = lastName {
            return "\(firstName) \(lastName)"
        } else if let firstName = firstName {
            return firstName
        } else if let lastName = lastName {
            return lastName
        }
        return nil
    }
    
    // Computed property for bio (maps to description)
    var bio: String? {
        get { description }
        set { description = newValue }
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
    init(id: UUID, email: String? = nil, firstName: String? = nil, lastName: String? = nil, description: String? = nil, avatarUrl: String? = nil, createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.description = description
        self.avatarUrl = avatarUrl
        self.winePreferences = nil
        self.favoriteRegions = nil
        self.favoriteVarietals = nil
        self.favoriteStyles = nil
        self.priceRange = nil
        self.tastingNoteStyle = "casual"  // Default to casual
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