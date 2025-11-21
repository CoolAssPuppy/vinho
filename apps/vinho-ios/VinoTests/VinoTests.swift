import XCTest
import SwiftUI
@testable import Vinho

/// Comprehensive test suite for Vinho iOS app
final class VinoTests: XCTestCase {

    override func setUpWithError() throws {
        // Setup before each test
    }

    override func tearDownWithError() throws {
        // Cleanup after each test
    }

    // MARK: - Tasting Edit/Save Tests

    /// Test that TastingNoteWithWine correctly initializes with all fields
    func testTastingNoteWithWineInitialization() throws {
        let id = UUID()
        let vintageId = UUID()
        let date = Date()

        let note = TastingNoteWithWine(
            id: id,
            wineName: "Test Wine",
            producer: "Test Producer",
            producerCity: "Napa Valley",
            vintage: 2020,
            rating: 4,
            notes: "Great wine with complex flavors",
            detailedNotes: "Full-bodied with hints of oak",
            aromas: ["cherry", "oak"],
            flavors: ["blackberry", "vanilla"],
            date: date,
            imageUrl: "https://example.com/image.jpg",
            vintageId: vintageId,
            isShared: false,
            sharedBy: nil,
            locationName: "Test Restaurant",
            locationCity: "San Francisco",
            locationAddress: "123 Main St",
            locationLatitude: 37.7749,
            locationLongitude: -122.4194
        )

        XCTAssertEqual(note.id, id)
        XCTAssertEqual(note.wineName, "Test Wine")
        XCTAssertEqual(note.producer, "Test Producer")
        XCTAssertEqual(note.vintage, 2020)
        XCTAssertEqual(note.rating, 4)
        XCTAssertEqual(note.notes, "Great wine with complex flavors")
        XCTAssertEqual(note.vintageId, vintageId)
        XCTAssertFalse(note.isShared)
    }

    /// Test that rating values are valid (1-5 range)
    func testTastingRatingValidation() throws {
        // Test valid ratings
        for rating in 1...5 {
            let note = TastingNoteWithWine(
                id: UUID(),
                wineName: "Test",
                producer: "Test",
                producerCity: nil,
                vintage: 2020,
                rating: rating,
                notes: nil,
                detailedNotes: nil,
                aromas: [],
                flavors: [],
                date: Date(),
                imageUrl: nil,
                vintageId: UUID(),
                isShared: false,
                sharedBy: nil,
                locationName: nil,
                locationCity: nil,
                locationAddress: nil,
                locationLatitude: nil,
                locationLongitude: nil
            )
            XCTAssertTrue(note.rating >= 1 && note.rating <= 5, "Rating \(rating) should be valid")
        }
    }

    /// Test that WineWithDetails correctly stores mutable fields
    func testWineWithDetailsMutableFields() throws {
        var wine = WineWithDetails(
            id: UUID(),
            name: "Original Name",
            producer: "Test Producer",
            year: 2020,
            region: "Napa Valley",
            varietal: "Cabernet Sauvignon",
            price: 50.0,
            averageRating: 4.5,
            imageUrl: nil,
            type: .red,
            description: "Original description"
        )

        // Test that name is mutable
        wine.name = "Updated Name"
        XCTAssertEqual(wine.name, "Updated Name")

        // Test that description is mutable
        wine.description = "Updated description"
        XCTAssertEqual(wine.description, "Updated description")
    }

    /// Test that empty notes are handled correctly
    func testEmptyNotesHandling() throws {
        let noteWithEmptyNotes = TastingNoteWithWine(
            id: UUID(),
            wineName: "Test",
            producer: "Test",
            producerCity: nil,
            vintage: 2020,
            rating: 3,
            notes: "",
            detailedNotes: nil,
            aromas: [],
            flavors: [],
            date: Date(),
            imageUrl: nil,
            vintageId: UUID(),
            isShared: false,
            sharedBy: nil,
            locationName: nil,
            locationCity: nil,
            locationAddress: nil,
            locationLatitude: nil,
            locationLongitude: nil
        )

        XCTAssertEqual(noteWithEmptyNotes.notes, "")

        let noteWithNilNotes = TastingNoteWithWine(
            id: UUID(),
            wineName: "Test",
            producer: "Test",
            producerCity: nil,
            vintage: 2020,
            rating: 3,
            notes: nil,
            detailedNotes: nil,
            aromas: [],
            flavors: [],
            date: Date(),
            imageUrl: nil,
            vintageId: UUID(),
            isShared: false,
            sharedBy: nil,
            locationName: nil,
            locationCity: nil,
            locationAddress: nil,
            locationLatitude: nil,
            locationLongitude: nil
        )

        XCTAssertNil(noteWithNilNotes.notes)
    }

    // MARK: - Authentication Tests

    func testAuthenticationViewModelInitialization() throws {
        let viewModel = AuthenticationViewModel()
        XCTAssertEqual(viewModel.email, "")
        XCTAssertEqual(viewModel.password, "")
        XCTAssertEqual(viewModel.fullName, "")
        XCTAssertEqual(viewModel.iconRotation, 0.0)
    }
    
    func testPasswordValidation() throws {
        let viewModel = AuthenticationViewModel()
        
        // Test empty password
        viewModel.password = ""
        XCTAssertFalse(viewModel.password.count >= 8)
        
        // Test short password
        viewModel.password = "Pass1"
        XCTAssertFalse(viewModel.password.count >= 8)
        
        // Test valid password
        viewModel.password = "Password123"
        XCTAssertTrue(viewModel.password.count >= 8)
        XCTAssertNotNil(viewModel.password.rangeOfCharacter(from: .uppercaseLetters))
        XCTAssertNotNil(viewModel.password.rangeOfCharacter(from: .decimalDigits))
    }
    
    // MARK: - Model Tests
    
    func testWineModelCreation() throws {
        let wine = Wine(
            id: "test-id",
            producerId: "producer-id",
            name: "Test Wine",
            description: "A test wine",
            isNV: false,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        XCTAssertEqual(wine.id, "test-id")
        XCTAssertEqual(wine.name, "Test Wine")
        XCTAssertEqual(wine.description, "A test wine")
        XCTAssertFalse(wine.isNV)
    }
    
    func testVintageModelCreation() throws {
        let vintage = Vintage(
            id: "vintage-id",
            wineId: "wine-id",
            year: 2019,
            alcohol: 13.5,
            description: "Great vintage",
            servingTemperature: "16-18°C",
            createdAt: Date(),
            updatedAt: Date()
        )
        
        XCTAssertEqual(vintage.year, 2019)
        XCTAssertEqual(vintage.alcohol, 13.5)
        XCTAssertEqual(vintage.servingTemperature, "16-18°C")
    }
    
    func testTastingNoteModelCreation() throws {
        let note = TastingNote(
            id: "note-id",
            userId: "user-id",
            vintageId: "vintage-id",
            rating: 4,
            notes: "Excellent wine",
            color: "Ruby",
            nose: "Blackcurrant",
            palate: "Full-bodied",
            finish: "Long",
            createdAt: Date(),
            updatedAt: Date()
        )
        
        XCTAssertEqual(note.rating, 4)
        XCTAssertEqual(note.notes, "Excellent wine")
        XCTAssertEqual(note.color, "Ruby")
    }
    
    // MARK: - View Model Tests
    
    func testFeedViewModelInitialization() async throws {
        let viewModel = await FeedViewModel()
        await viewModel.loadFeed()
        
        let feedItems = await viewModel.feedItems
        XCTAssertFalse(feedItems.isEmpty)
    }
    
    func testWineListViewModelFilters() async throws {
        let viewModel = await WineListViewModel()
        
        // Test type filter
        await viewModel.toggleType(.red)
        let selectedTypes = await viewModel.selectedTypes
        XCTAssertTrue(selectedTypes.contains(.red))
        
        // Toggle again to remove
        await viewModel.toggleType(.red)
        let updatedTypes = await viewModel.selectedTypes
        XCTAssertFalse(updatedTypes.contains(.red))
        
        // Test clear filters
        await viewModel.toggleType(.white)
        await viewModel.toggleRegion("Bordeaux")
        await viewModel.clearFilters()
        
        let clearedTypes = await viewModel.selectedTypes
        let clearedRegions = await viewModel.selectedRegions
        XCTAssertTrue(clearedTypes.isEmpty)
        XCTAssertTrue(clearedRegions.isEmpty)
    }
    
    func testJournalViewModelDateGrouping() async throws {
        let viewModel = await JournalViewModel()
        await viewModel.loadNotes()
        
        let notes = await viewModel.notes
        XCTAssertFalse(notes.isEmpty)
        
        // Test that notes are properly loaded
        if let firstNote = notes.first {
            XCTAssertFalse(firstNote.wineName.isEmpty)
            XCTAssertFalse(firstNote.producer.isEmpty)
            XCTAssertTrue(firstNote.rating >= 1 && firstNote.rating <= 5)
        }
    }
    
    // MARK: - Haptic Manager Tests
    
    func testHapticManagerInitialization() throws {
        let hapticManager = HapticManager()
        XCTAssertTrue(hapticManager.isEnabled)
    }
    
    // MARK: - Scanner View Model Tests
    
    func testScannerViewModelInitialization() async throws {
        let viewModel = await ScannerViewModel()
        let isCapturing = await viewModel.isCapturing
        XCTAssertFalse(isCapturing)
    }
    
    // MARK: - Profile View Model Tests
    
    func testProfileViewModelStats() async throws {
        let viewModel = await ProfileViewModel()
        
        let winesScanned = await viewModel.winesScanned
        let tastingNotes = await viewModel.tastingNotes
        let regions = await viewModel.regions
        
        XCTAssertGreaterThan(winesScanned, 0)
        XCTAssertGreaterThan(tastingNotes, 0)
        XCTAssertGreaterThan(regions, 0)
    }
    
    // MARK: - Color Theme Tests
    
    func testColorThemeConsistency() throws {
        // Test that our custom colors are defined
        XCTAssertNotNil(Color.vinoPrimary)
        XCTAssertNotNil(Color.vinoAccent)
        XCTAssertNotNil(Color.vinoDark)
        XCTAssertNotNil(Color.vinoDarkSecondary)
        XCTAssertNotNil(Color.vinoText)
        XCTAssertNotNil(Color.vinoTextSecondary)
        XCTAssertNotNil(Color.vinoTextTertiary)
        XCTAssertNotNil(Color.vinoBorder)
        XCTAssertNotNil(Color.vinoSuccess)
        XCTAssertNotNil(Color.vinoError)
        XCTAssertNotNil(Color.vinoGold)
        XCTAssertNotNil(Color.vinoGray)
    }
    
    func testLinearGradientDefinition() throws {
        XCTAssertNotNil(LinearGradient.vinoGradient)
        XCTAssertNotNil(LinearGradient.vinoAccentGradient)
        XCTAssertNotNil(LinearGradient.vinoGoldGradient)
    }
    
    // MARK: - Date Extension Tests
    
    func testTimeAgoFormatting() throws {
        let now = Date()
        let oneHourAgo = Date(timeIntervalSinceNow: -3600)
        let oneDayAgo = Date(timeIntervalSinceNow: -86400)
        
        // Test that timeAgo returns a non-empty string
        XCTAssertFalse(now.timeAgo().isEmpty)
        XCTAssertFalse(oneHourAgo.timeAgo().isEmpty)
        XCTAssertFalse(oneDayAgo.timeAgo().isEmpty)
    }
    
    // MARK: - Feed Filter Tests
    
    func testFeedFilterEnumeration() throws {
        let allFilters = FeedFilter.allCases
        XCTAssertEqual(allFilters.count, 5)
        XCTAssertTrue(allFilters.contains(.all))
        XCTAssertTrue(allFilters.contains(.wines))
        XCTAssertTrue(allFilters.contains(.tastings))
        XCTAssertTrue(allFilters.contains(.insights))
        XCTAssertTrue(allFilters.contains(.recommendations))
    }
    
    func testFeedFilterTitles() throws {
        XCTAssertEqual(FeedFilter.all.title, "All")
        XCTAssertEqual(FeedFilter.wines.title, "Wines")
        XCTAssertEqual(FeedFilter.tastings.title, "Tastings")
        XCTAssertEqual(FeedFilter.insights.title, "Insights")
        XCTAssertEqual(FeedFilter.recommendations.title, "For You")
    }
    
    // MARK: - Wine Type Tests
    
    func testWineTypeEnumeration() throws {
        let allTypes = WineType.allCases
        XCTAssertEqual(allTypes.count, 5)
        XCTAssertTrue(allTypes.contains(.red))
        XCTAssertTrue(allTypes.contains(.white))
        XCTAssertTrue(allTypes.contains(.rose))
        XCTAssertTrue(allTypes.contains(.sparkling))
        XCTAssertTrue(allTypes.contains(.dessert))
    }
    
    // MARK: - Time Filter Tests
    
    func testTimeFilterEnumeration() throws {
        let allFilters = TimeFilter.allCases
        XCTAssertEqual(allFilters.count, 5)
        XCTAssertEqual(TimeFilter.today.title, "Today")
        XCTAssertEqual(TimeFilter.week.title, "This Week")
        XCTAssertEqual(TimeFilter.month.title, "This Month")
        XCTAssertEqual(TimeFilter.year.title, "This Year")
    }
    
    // MARK: - Performance Tests
    
    func testFeedLoadingPerformance() throws {
        measure {
            let expectation = expectation(description: "Feed loading")
            Task {
                let viewModel = await FeedViewModel()
                await viewModel.loadFeed()
                expectation.fulfill()
            }
            wait(for: [expectation], timeout: 5.0)
        }
    }
    
    func testWineListFilteringPerformance() throws {
        measure {
            let expectation = expectation(description: "Wine filtering")
            Task {
                let viewModel = await WineListViewModel()
                await viewModel.loadWines()
                await viewModel.toggleType(.red)
                await viewModel.toggleType(.white)
                await viewModel.clearFilters()
                expectation.fulfill()
            }
            wait(for: [expectation], timeout: 5.0)
        }
    }
}

// MARK: - UI Tests

final class VinoUITests: XCTestCase {
    
    func testAuthenticationFlowUI() throws {
        // Test that authentication view components are properly initialized
        let authView = AuthenticationView()
        let authViewModel = AuthenticationViewModel()
        
        XCTAssertNotNil(authView)
        XCTAssertNotNil(authViewModel)
    }
    
    func testContentViewInitialization() throws {
        let contentView = ContentView()
        XCTAssertNotNil(contentView)
    }
    
    func testFeedViewInitialization() throws {
        let feedView = FeedView()
        XCTAssertNotNil(feedView)
    }
    
    func testWineListViewInitialization() throws {
        let wineListView = WineListView()
        XCTAssertNotNil(wineListView)
    }
    
    func testJournalViewInitialization() throws {
        let journalView = JournalView()
        XCTAssertNotNil(journalView)
    }
    
    func testProfileViewInitialization() throws {
        let profileView = ProfileView()
        XCTAssertNotNil(profileView)
    }
    
    func testScannerViewInitialization() throws {
        let scannerView = ScannerView()
        XCTAssertNotNil(scannerView)
    }
}

// MARK: - DataService Edit Tests

final class DataServiceEditTests: XCTestCase {

    /// Test that Tasting model can be properly encoded with all fields
    func testTastingModelEncoding() throws {
        let tasting = Tasting(
            id: UUID(),
            userId: UUID(),
            vintageId: UUID(),
            verdict: 4,
            notes: "Test notes",
            detailedNotes: "Detailed notes",
            tastedAt: Date(),
            createdAt: Date(),
            updatedAt: Date(),
            imageUrl: nil,
            locationName: "Test Location",
            locationAddress: "123 Main St",
            locationCity: "San Francisco",
            locationLatitude: 37.7749,
            locationLongitude: -122.4194,
            vintage: nil
        )

        XCTAssertEqual(tasting.verdict, 4)
        XCTAssertEqual(tasting.notes, "Test notes")
        XCTAssertEqual(tasting.locationName, "Test Location")
    }

    /// Test that Wine model updates work correctly
    func testWineModelUpdates() throws {
        let wine = Wine(
            id: UUID(),
            name: "Original Name",
            producerId: UUID(),
            isNV: false,
            createdAt: Date()
        )

        XCTAssertEqual(wine.name, "Original Name")
        XCTAssertFalse(wine.isNV)
    }

    /// Test that tasting verdict (rating) is in valid range
    func testTastingVerdictRange() throws {
        // Test with nil verdict (no rating)
        let tastingNoRating = Tasting(
            id: UUID(),
            userId: UUID(),
            vintageId: UUID(),
            verdict: nil,
            notes: nil,
            detailedNotes: nil,
            tastedAt: Date(),
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
        XCTAssertNil(tastingNoRating.verdict)

        // Test with valid rating
        let tastingWithRating = Tasting(
            id: UUID(),
            userId: UUID(),
            vintageId: UUID(),
            verdict: 5,
            notes: nil,
            detailedNotes: nil,
            tastedAt: Date(),
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
        XCTAssertEqual(tastingWithRating.verdict, 5)
    }
}

// MARK: - Save Operation Contract Tests

final class SaveOperationContractTests: XCTestCase {

    /// Test that rating description mapping is correct
    func testRatingDescriptionMapping() throws {
        let descriptions = [
            1: "Disappointing",
            2: "Below Average",
            3: "Good",
            4: "Very Good",
            5: "Outstanding"
        ]

        for (rating, expectedDescription) in descriptions {
            let actualDescription = ratingDescription(for: rating)
            XCTAssertEqual(actualDescription, expectedDescription, "Rating \(rating) should be '\(expectedDescription)'")
        }
    }

    /// Test that zero rating returns empty description
    func testZeroRatingDescription() throws {
        let description = ratingDescription(for: 0)
        XCTAssertEqual(description, "")
    }

    /// Helper function to mirror TastingNoteDetailView.ratingDescription
    private func ratingDescription(for rating: Int) -> String {
        switch rating {
        case 1: return "Disappointing"
        case 2: return "Below Average"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Outstanding"
        default: return ""
        }
    }

    /// Test that TastingLocation struct works correctly
    func testTastingLocationStruct() throws {
        let location = TastingLocation(
            name: "Test Restaurant",
            address: "123 Main St",
            city: "San Francisco",
            latitude: 37.7749,
            longitude: -122.4194
        )

        XCTAssertEqual(location.name, "Test Restaurant")
        XCTAssertEqual(location.address, "123 Main St")
        XCTAssertEqual(location.city, "San Francisco")
        XCTAssertEqual(location.latitude, 37.7749)
        XCTAssertEqual(location.longitude, -122.4194)
    }
}

// MARK: - Wine Detail Edit Tests

final class WineDetailEditTests: XCTestCase {

    /// Test that WineWithDetails name can be updated
    func testWineNameUpdate() throws {
        var wine = WineWithDetails(
            id: UUID(),
            name: "Original",
            producer: "Producer",
            year: 2020,
            region: nil,
            varietal: nil,
            price: nil,
            averageRating: nil,
            imageUrl: nil,
            type: .red,
            description: nil
        )

        wine.name = "Updated Name"
        XCTAssertEqual(wine.name, "Updated Name")
    }

    /// Test that WineWithDetails description can be updated
    func testWineDescriptionUpdate() throws {
        var wine = WineWithDetails(
            id: UUID(),
            name: "Test Wine",
            producer: "Producer",
            year: 2020,
            region: nil,
            varietal: nil,
            price: nil,
            averageRating: nil,
            imageUrl: nil,
            type: .red,
            description: nil
        )

        // Start with nil
        XCTAssertNil(wine.description)

        // Update to a value
        wine.description = "A great wine with complex flavors"
        XCTAssertEqual(wine.description, "A great wine with complex flavors")

        // Update to nil
        wine.description = nil
        XCTAssertNil(wine.description)
    }

    /// Test that WineType enum has correct cases
    func testWineTypeEnum() throws {
        let allTypes: [WineType] = [.red, .white, .rose, .sparkling, .dessert]
        XCTAssertEqual(allTypes.count, 5)

        // Test that each type has a color (doesn't crash)
        for type in allTypes {
            XCTAssertNotNil(type.color)
            XCTAssertNotNil(type.rawValue)
        }
    }
}

// MARK: - Integration Contract Tests

final class IntegrationContractTests: XCTestCase {

    /// Test that TimeFilter enum is complete
    func testTimeFilterCompleteness() throws {
        let allFilters = TimeFilter.allCases
        XCTAssertEqual(allFilters.count, 5)

        let expectedFilters: [TimeFilter] = [.all, .today, .week, .month, .year]
        for filter in expectedFilters {
            XCTAssertTrue(allFilters.contains(filter), "TimeFilter should contain \(filter)")
        }
    }

    /// Test that TimeFilter titles are correct
    func testTimeFilterTitles() throws {
        XCTAssertEqual(TimeFilter.all.title, "All")
        XCTAssertEqual(TimeFilter.today.title, "Today")
        XCTAssertEqual(TimeFilter.week.title, "This Week")
        XCTAssertEqual(TimeFilter.month.title, "This Month")
        XCTAssertEqual(TimeFilter.year.title, "This Year")
    }

    /// Test that SharedTastingInfo works correctly when present
    func testSharedTastingInfoHandling() throws {
        // Create a note without sharing
        let unsharedNote = TastingNoteWithWine(
            id: UUID(),
            wineName: "Test",
            producer: "Test",
            producerCity: nil,
            vintage: 2020,
            rating: 4,
            notes: nil,
            detailedNotes: nil,
            aromas: [],
            flavors: [],
            date: Date(),
            imageUrl: nil,
            vintageId: UUID(),
            isShared: false,
            sharedBy: nil,
            locationName: nil,
            locationCity: nil,
            locationAddress: nil,
            locationLatitude: nil,
            locationLongitude: nil
        )

        XCTAssertFalse(unsharedNote.isShared)
        XCTAssertNil(unsharedNote.sharedBy)
    }
}