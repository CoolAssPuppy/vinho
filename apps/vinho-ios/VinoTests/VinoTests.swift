import Foundation
import XCTest
@testable import Vinho

final class VinoTests: XCTestCase {
    @MainActor
    func testInviteLinksExtractTheirCode() {
        XCTAssertEqual(
            DeepLinkHandler.inviteCode(from: URL(string: "https://www.vinho.dev/invite/ABC123")!),
            "ABC123"
        )
        XCTAssertEqual(
            DeepLinkHandler.inviteCode(from: URL(string: "https://vinho.dev/invite/XYZ789")!),
            "XYZ789"
        )
        XCTAssertNil(
            DeepLinkHandler.inviteCode(from: URL(string: "https://example.com/invite/ABC123")!)
        )
    }
    func testWineKeepsIdentityAndDefaults() {
        let wineID = UUID()
        let producerID = UUID()
        let createdAt = Date(timeIntervalSince1970: 1_700_000_000)

        let wine = Wine(
            id: wineID,
            name: "Test Wine",
            producerId: producerID,
            isNV: true,
            createdAt: createdAt
        )

        XCTAssertEqual(wine.id, wineID)
        XCTAssertEqual(wine.producerId, producerID)
        XCTAssertEqual(wine.name, "Test Wine")
        XCTAssertTrue(wine.isNV)
        XCTAssertEqual(wine.createdAt, createdAt)
        XCTAssertNil(wine.producer)
        XCTAssertNil(wine.vintages)
    }

    func testVintageKeepsNullableWineFacts() {
        let vintage = Vintage(
            id: UUID(),
            wineId: UUID(),
            year: 2019,
            abv: 13.5,
            vineyardId: nil,
            climateZoneId: nil,
            soilTypeId: nil,
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            communityRating: 4.2,
            communityRatingCount: 18
        )

        XCTAssertEqual(vintage.year, 2019)
        XCTAssertEqual(vintage.abv, 13.5)
        XCTAssertEqual(vintage.communityRating, 4.2)
        XCTAssertEqual(vintage.communityRatingCount, 18)
    }

    func testTastingDecodesDatabaseDateFormats() throws {
        let tastingID = UUID()
        let userID = UUID()
        let vintageID = UUID()
        let json = """
        {
          "id": "\(tastingID.uuidString)",
          "user_id": "\(userID.uuidString)",
          "vintage_id": "\(vintageID.uuidString)",
          "verdict": 5,
          "notes": "Excellent wine",
          "detailed_notes": "Long finish",
          "tasted_at": "2026-08-29",
          "created_at": "2026-08-29T12:00:00Z",
          "updated_at": "2026-08-29T12:30:00Z"
        }
        """

        let tasting = try JSONDecoder().decode(Tasting.self, from: Data(json.utf8))

        XCTAssertEqual(tasting.id, tastingID)
        XCTAssertEqual(tasting.userId, userID)
        XCTAssertEqual(tasting.vintageId, vintageID)
        XCTAssertEqual(tasting.verdict, 5)
        XCTAssertEqual(tasting.notes, "Excellent wine")
        XCTAssertEqual(tasting.detailedNotes, "Long finish")
        XCTAssertFalse(tasting.isShared)
    }

    func testPriceRangeDefaultsMatchOnboarding() {
        let priceRange = PriceRange()

        XCTAssertEqual(priceRange.low, 20)
        XCTAssertEqual(priceRange.high, 100)
    }

    func testFilterLabelsMatchTheUserInterface() {
        XCTAssertEqual(FeedFilter.all.title, "All")
        XCTAssertEqual(FeedFilter.recommendations.title, "For You")
        XCTAssertEqual(TimeFilter.week.title, "This Week")
        XCTAssertEqual(TimeFilter.year.title, "This Year")
        XCTAssertEqual(WineType.rose.rawValue, "Rosé")
        XCTAssertEqual(WineType.allCases.count, 5)
    }

    func testRelativeDateTextIsPresent() {
        XCTAssertFalse(Date(timeIntervalSinceNow: -3_600).timeAgo().isEmpty)
    }
}
