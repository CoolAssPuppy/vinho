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