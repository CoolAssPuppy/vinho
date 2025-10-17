import Foundation
import SwiftUI

// MARK: - Sharing Connection Model
struct SharingConnection: Identifiable, Codable, Hashable {
    let id: UUID
    let sharerId: UUID
    let viewerId: UUID
    let status: SharingStatus
    let createdAt: Date
    let updatedAt: Date
    let acceptedAt: Date?
    var sharerProfile: SharerProfile?
    var viewerProfile: ViewerProfile?

    enum SharingStatus: String, Codable {
        case pending
        case accepted
        case rejected
        case revoked
    }

    enum CodingKeys: String, CodingKey {
        case id
        case sharerId = "sharer_id"
        case viewerId = "viewer_id"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case acceptedAt = "accepted_at"
        case sharerProfile = "sharer_profile"
        case viewerProfile = "viewer_profile"
    }

    // Custom decoding for nested profile objects from JSONB
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(UUID.self, forKey: .id)
        sharerId = try container.decode(UUID.self, forKey: .sharerId)
        viewerId = try container.decode(UUID.self, forKey: .viewerId)

        let statusString = try container.decode(String.self, forKey: .status)
        status = SharingStatus(rawValue: statusString) ?? .pending

        // Handle date decoding
        if let dateString = try? container.decode(String.self, forKey: .createdAt) {
            let formatter = ISO8601DateFormatter()
            createdAt = formatter.date(from: dateString) ?? Date()
        } else {
            createdAt = try container.decode(Date.self, forKey: .createdAt)
        }

        if let dateString = try? container.decode(String.self, forKey: .updatedAt) {
            let formatter = ISO8601DateFormatter()
            updatedAt = formatter.date(from: dateString) ?? Date()
        } else {
            updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        }

        if let dateString = try? container.decode(String.self, forKey: .acceptedAt) {
            let formatter = ISO8601DateFormatter()
            acceptedAt = formatter.date(from: dateString)
        } else {
            acceptedAt = try? container.decode(Date.self, forKey: .acceptedAt)
        }

        sharerProfile = try? container.decode(SharerProfile.self, forKey: .sharerProfile)
        viewerProfile = try? container.decode(ViewerProfile.self, forKey: .viewerProfile)
    }
}

// MARK: - Sharer Profile (from JSONB)
struct SharerProfile: Codable, Hashable {
    let id: UUID
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?

    var fullName: String {
        let parts = [firstName, lastName].compactMap { $0 }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " ")
    }

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - Viewer Profile (from JSONB)
struct ViewerProfile: Codable, Hashable {
    let id: UUID
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?

    var fullName: String {
        let parts = [firstName, lastName].compactMap { $0 }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " ")
    }

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - User Sharing Preferences Model
struct UserSharingPreferences: Codable, Hashable {
    let id: UUID
    let userId: UUID
    var visibleSharers: [String] // Array of user ID strings
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case visibleSharers = "visible_sharers"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Shared Tasting Info
// This will be embedded in Tasting when it's shared
struct SharedTastingInfo: Codable, Hashable {
    let userId: UUID
    let firstName: String?
    let lastName: String?

    var fullName: String {
        let parts = [firstName, lastName].compactMap { $0 }
        return parts.isEmpty ? "Unknown" : parts.joined(separator: " ")
    }
}
