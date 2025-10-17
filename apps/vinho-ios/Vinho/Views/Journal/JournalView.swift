import SwiftUI
import Supabase
import CoreLocation

/// Beautiful journal view for wine tasting notes
struct JournalView: View {
    @StateObject private var viewModel = JournalViewModel()
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var authManager: AuthManager
    @State private var showingNewNote = false
    @State private var noteToEdit: TastingNoteWithWine?
    @State private var selectedTimeFilter = TimeFilter.all
    @State private var searchText = ""
    @State private var pendingWinesCount = 0
    @State private var selectedTab = 0
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            // Background
            Color.vinoDark
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Pending wines banner
                if pendingWinesCount > 0 {
                    HStack(spacing: 12) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .vinoGold))
                            .scaleEffect(0.8)

                        Text("\(pendingWinesCount) wine\(pendingWinesCount > 1 ? "s" : "") \(pendingWinesCount > 1 ? "are" : "is") being processed")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.vinoText)

                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.vinoGold.opacity(0.1))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.vinoGold.opacity(0.3), lineWidth: 1)
                            )
                    )
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .transition(.asymmetric(
                        insertion: .move(edge: .top).combined(with: .opacity),
                        removal: .move(edge: .top).combined(with: .opacity)
                    ))
                    .animation(.easeInOut(duration: 0.3), value: pendingWinesCount)
                }

                // Tab Selection
                tabSelector
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .padding(.bottom, 12)

                // Tab Content
                if selectedTab == 0 {
                    // Tastings Tab
                    VStack(spacing: 0) {
                        // Search Bar with improved search functionality
                        searchBar
                            .padding(.horizontal)
                            .padding(.bottom, 12)
                            .onChange(of: searchText) { _, newValue in
                                // Cancel previous search task
                                searchTask?.cancel()

                                // Debounce search with 0.5 second delay
                                searchTask = Task {
                                    try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                                    if !Task.isCancelled {
                                        await viewModel.searchNotes(query: newValue)
                                    }
                                }
                            }

                        // Time Filter
                        timeFilterBar
                            .padding(.horizontal)
                            .padding(.bottom, 12)

                        // Journal Entries
                        if viewModel.isLoading && viewModel.notes.isEmpty {
                            // Show loading spinner only on initial load
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .vinoGold))
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .padding()
                        } else if filteredNotes.isEmpty && !viewModel.isLoading && viewModel.notes.isEmpty {
                            // Only show empty state if no data at all and not loading
                            emptyState
                        } else if filteredNotes.isEmpty && !viewModel.notes.isEmpty {
                            // Show "no results" when filters/search returns nothing but data exists
                            NoResultsView(searchText: searchText, selectedTimeFilter: selectedTimeFilter)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                            journalList
                        }
                    }
                } else {
                    // Suggestions Tab
                    suggestionsTab
                        .padding(.horizontal)
                }
            }
        }
        .sheet(isPresented: $showingNewNote) {
            TastingNoteEditorView(vintageId: nil, existingTasting: nil)
                .environmentObject(hapticManager)
                .environmentObject(authManager)
        }
        .sheet(item: $noteToEdit) { note in
            // Find the original Tasting object from DataService, or create one from the note
            let tasting = viewModel.dataService.tastings.first(where: { $0.id == note.id }) ?? Tasting(
                id: note.id,
                userId: UUID(), // Will be set by the editor
                vintageId: note.vintageId,
                verdict: note.rating > 0 ? note.rating : nil,
                notes: note.notes,
                detailedNotes: note.detailedNotes,
                tastedAt: note.date,
                createdAt: note.date,
                updatedAt: note.date,
                imageUrl: note.imageUrl,
                locationName: nil,
                locationAddress: nil,
                locationCity: nil,
                locationLatitude: nil,
                locationLongitude: nil,
                vintage: nil
            )

            TastingNoteEditorView(vintageId: note.vintageId, existingTasting: tasting)
                .environmentObject(hapticManager)
                .environmentObject(authManager)
        }
        .onAppear {
            Task {
                await viewModel.loadNotes()
                await loadPendingWines()
            }
        }
    }
    
    
    var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoTextSecondary)

            TextField("Search for anything", text: $searchText)
                .font(.system(size: 16))
                .foregroundColor(.vinoText)

            if viewModel.isSearching {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .vinoGold))
                    .scaleEffect(0.8)
            } else if !searchText.isEmpty {
                Button {
                    hapticManager.lightImpact()
                    searchText = ""
                    viewModel.searchResults.removeAll()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
    }
    
    var timeFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TimeFilter.allCases) { filter in
                    TimeFilterChip(
                        title: filter.title,
                        isSelected: selectedTimeFilter == filter
                    ) {
                        hapticManager.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedTimeFilter = filter
                        }
                    }
                }
            }
        }
    }
    
    var journalList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(groupedNotes.keys.sorted(by: >), id: \.self) { date in
                    VStack(alignment: .leading, spacing: 12) {
                        // Date Header
                        Text(dateHeaderText(for: date))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.vinoTextSecondary)
                            .textCase(.uppercase)
                            .padding(.horizontal, 4)

                        // Notes for this date
                        ForEach(groupedNotes[date] ?? []) { note in
                            TastingNoteCard(note: note)
                                .onTapGesture {
                                    hapticManager.lightImpact()
                                    noteToEdit = note
                                }
                                .onAppear {
                                    // Load more when approaching the end
                                    if note.id == filteredNotes.last?.id && searchText.isEmpty {
                                        Task {
                                            await viewModel.loadMoreNotes()
                                        }
                                    }
                                }
                        }
                    }
                }

                // Loading indicator for pagination
                if viewModel.isLoadingMore {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .vinoGold))
                        .padding()
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
        .refreshable {
            hapticManager.mediumImpact()
            await viewModel.refreshNotes()
            await loadPendingWines()
        }
    }
    
    var emptyState: some View {
        VStack(spacing: 24) {
            Image(systemName: "book.closed")
                .font(.system(size: 60))
                .foregroundColor(.vinoTextTertiary)
            
            Text("No Tasting Notes Yet")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.vinoText)
            
            Text("Start your wine journey by\nadding your first tasting note")
                .font(.system(size: 16))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)
            
            Button {
                hapticManager.mediumImpact()
                showingNewNote = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Add First Note")
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(LinearGradient.vinoGradient)
                .clipShape(Capsule())
                .shadow(color: .vinoPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    var filteredNotes: [TastingNoteWithWine] {
        // Only use search results if actively searching (searchText is not empty)
        let notesToFilter = !searchText.isEmpty ? viewModel.searchResults : viewModel.notes

        return notesToFilter.filter { note in
            // Apply time filter
            let passesTimeFilter = switch selectedTimeFilter {
            case .all:
                true
            case .today:
                Calendar.current.isDateInToday(note.date)
            case .week:
                note.date > Date().addingTimeInterval(-7 * 24 * 3600)
            case .month:
                note.date > Date().addingTimeInterval(-30 * 24 * 3600)
            case .year:
                note.date > Date().addingTimeInterval(-365 * 24 * 3600)
            }

            return passesTimeFilter
        }
    }
    
    var groupedNotes: [Date: [TastingNoteWithWine]] {
        Dictionary(grouping: filteredNotes) { note in
            Calendar.current.startOfDay(for: note.date)
        }
    }
    
    func dateHeaderText(for date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            return "Today"
        } else if Calendar.current.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE, MMM d"
            return formatter.string(from: date)
        }
    }

    var tabSelector: some View {
        HStack(spacing: 0) {
            // Tastings Tab
            Button {
                hapticManager.lightImpact()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    selectedTab = 0
                }
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "book.pages")
                        .font(.system(size: 16, weight: .medium))
                    Text("Tastings")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(selectedTab == 0 ? .white : .vinoTextSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(selectedTab == 0 ? LinearGradient.vinoGradient : LinearGradient(colors: [Color.clear], startPoint: .leading, endPoint: .trailing))
                )
            }

            // Suggestions Tab
            Button {
                hapticManager.lightImpact()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    selectedTab = 1
                }
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "lightbulb")
                        .font(.system(size: 16, weight: .medium))
                    Text("Suggestions")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(selectedTab == 1 ? .white : .vinoTextSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(selectedTab == 1 ? LinearGradient.vinoGradient : LinearGradient(colors: [Color.clear], startPoint: .leading, endPoint: .trailing))
                )
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
    }

    var suggestionsTab: some View {
        SuggestionsView(tastings: viewModel.notes)
            .environmentObject(hapticManager)
    }
}

// MARK: - Tasting Note Card
struct TastingNoteCard: View {
    let note: TastingNoteWithWine
    @State private var imageLoaded = false
    
    var body: some View {
        HStack(spacing: 16) {
            // Wine Image
            ZStack {
                if let imageUrl = note.imageUrl {
                    AsyncImage(url: URL(string: imageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.vinoDarkSecondary)
                            .shimmer()
                    }
                } else {
                    ZStack {
                        LinearGradient(
                            colors: [Color.vinoPrimary.opacity(0.3), Color.vinoDarkSecondary],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        
                        Image(systemName: "wineglass")
                            .font(.system(size: 30))
                            .foregroundColor(.vinoPrimary.opacity(0.5))
                    }
                }
            }
            .frame(width: 80, height: 100)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            
            // Note Details
            VStack(alignment: .leading, spacing: 6) {
                // Wine Name + Vintage as title with shared indicator
                HStack(spacing: 6) {
                    Text("\(note.wineName) \(note.vintage != nil ? String(note.vintage!) : "NV")")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.vinoText)
                        .lineLimit(1)

                    if note.isShared, let sharedBy = note.sharedBy {
                        HStack(spacing: 2) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 8))
                            Text(sharedBy.fullName)
                                .font(.system(size: 9, weight: .medium))
                        }
                        .foregroundColor(.vinoAccent)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(Color.vinoAccent.opacity(0.15))
                        )
                    }
                }

                // Producer name as secondary
                Text(note.producer)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.vinoTextSecondary)
                    .lineLimit(1)

                // Producer city if available
                if let city = note.producerCity {
                    Text(city)
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                        .lineLimit(1)
                }

                // Rating
                HStack(spacing: 4) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < note.rating ? "star.fill" : "star")
                            .font(.system(size: 10))
                            .foregroundColor(index < note.rating ? .vinoGold : .vinoTextTertiary)
                    }

                    Text("·")
                        .foregroundColor(.vinoTextTertiary)

                    Text(note.date.timeAgo())
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextSecondary)
                }
                
                // Preview of notes
                if let notes = note.notes {
                    Text(notes)
                        .font(.system(size: 13))
                        .foregroundColor(.vinoTextSecondary)
                        .lineLimit(2)
                }
                
                // Flavor Tags
                if !note.flavors.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(note.flavors.prefix(3), id: \.self) { flavor in
                                FlavorTag(text: flavor)
                            }
                            if note.flavors.count > 3 {
                                Text("+\(note.flavors.count - 3)")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(.vinoTextTertiary)
                            }
                        }
                    }
                }
            }
            
            Spacer()
            
            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.vinoTextTertiary)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Supporting Views
struct TimeFilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? LinearGradient.vinoGradient : LinearGradient(colors: [Color.vinoDarkSecondary], startPoint: .leading, endPoint: .trailing))
                        .overlay(
                            Capsule()
                                .stroke(isSelected ? Color.clear : Color.vinoBorder, lineWidth: 1)
                        )
                )
                .foregroundColor(isSelected ? .white : .vinoTextSecondary)
        }
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
    }
}

struct FlavorTag: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(.vinoAccent)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(
                Capsule()
                    .fill(Color.vinoAccent.opacity(0.15))
            )
    }
}

struct NoResultsView: View {
    let searchText: String
    let selectedTimeFilter: TimeFilter

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.vinoTextTertiary)

            Text("No Results Found")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.vinoText)

            if !searchText.isEmpty {
                Text("No tastings match \"\(searchText)\"")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
            } else if selectedTimeFilter != .all {
                Text("No tastings for \(selectedTimeFilter.title.lowercased())")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
            }
        }
        .padding()
    }
}

// MARK: - View Model
@MainActor
// MARK: - Realtime and Pending Wines
extension JournalView {
    func loadPendingWines() async {
        let supabase = SupabaseManager.shared.client

        guard let userId = try? await supabase.auth.session.user.id else { return }

        do {
            let response = try await supabase
                .from("wines_added_queue")
                .select("id, status")
                .eq("user_id", value: userId.uuidString)
                .in("status", values: ["pending", "working"])
                .execute()

            let decoder = JSONDecoder()
            let wines = try decoder.decode([WineAddedStatus].self, from: response.data)
            await MainActor.run {
                pendingWinesCount = wines.count
            }
        } catch {
            print("Error loading pending wines: \(error)")
        }
    }

}

// Simple model for wine status
struct WineAddedStatus: Decodable {
    let id: UUID
    let status: String
}

@MainActor
class JournalViewModel: ObservableObject {
    @Published var notes: [TastingNoteWithWine] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var hasMorePages = true
    @Published var searchResults: [TastingNoteWithWine] = []
    @Published var isSearching = false

    private var currentPage = 0
    private let pageSize = 12
    private var allNotes: [TastingNoteWithWine] = []

    public let dataService = DataService.shared

    func loadNotes() async {
        isLoading = true
        currentPage = 0

        let tastings = await dataService.fetchUserTastingsPaginated(page: 0, pageSize: pageSize)
        hasMorePages = tastings.count == pageSize

        print("DataService has \(tastings.count) tastings for page 0")

        // Convert tastings to TastingNoteWithWine format
        let newNotes = convertTastings(tastings)

        // Only update if we got data or if this is the initial load
        allNotes = newNotes
        notes = allNotes
        print("Converted to \(notes.count) TastingNoteWithWine objects")
        isLoading = false
    }

    func loadMoreNotes() async {
        guard !isLoadingMore && hasMorePages else { return }

        isLoadingMore = true
        currentPage += 1

        let tastings = await dataService.fetchUserTastingsPaginated(page: currentPage, pageSize: pageSize)
        hasMorePages = tastings.count == pageSize

        let newNotes = convertTastings(tastings)
        allNotes.append(contentsOf: newNotes)
        notes = allNotes

        isLoadingMore = false
    }

    func searchNotes(query: String) async {
        guard !query.isEmpty else {
            searchResults.removeAll()
            isSearching = false
            return
        }

        isSearching = true
        let tastings = await dataService.searchTastings(query: query)
        searchResults = convertTastings(tastings)
        isSearching = false
    }

    private func convertTastings(_ tastings: [Tasting]) -> [TastingNoteWithWine] {
        return tastings.compactMap { tasting -> TastingNoteWithWine? in
            guard let vintage = tasting.vintage,
                  let wine = vintage.wine,
                  let producer = wine.producer else {
                return nil
            }

            return TastingNoteWithWine(
                id: tasting.id,
                wineName: wine.name,
                producer: producer.name,
                producerCity: nil,
                vintage: vintage.year,
                rating: tasting.verdict ?? 0,
                notes: tasting.notes,
                detailedNotes: tasting.detailedNotes,
                aromas: [],
                flavors: [],
                date: tasting.tastedAt,
                imageUrl: tasting.imageUrl,
                vintageId: vintage.id,
                isShared: tasting.isShared,
                sharedBy: tasting.sharedBy
            )
        }
    }

    func deleteTasting(_ tastingId: UUID) async {
        do {
            // Delete from Supabase
            let supabase = SupabaseManager.shared.client
            try await supabase
                .from("tastings")
                .delete()
                .eq("id", value: tastingId.uuidString)
                .execute()

            // Remove from local arrays
            await MainActor.run {
                notes.removeAll { $0.id == tastingId }
                allNotes.removeAll { $0.id == tastingId }
                searchResults.removeAll { $0.id == tastingId }
            }

            // Refresh the data service
            await dataService.fetchUserTastings()
        } catch {
            print("Error deleting tasting: \(error)")
        }
    }

    func refreshNotes() async {
        // Clear all existing data to force complete refresh
        await MainActor.run {
            notes.removeAll()
            allNotes.removeAll()
            searchResults.removeAll()
            currentPage = 0
            hasMorePages = true
        }

        // Force a fresh fetch from the database
        await dataService.fetchUserTastings()

        // Reload the first page of notes
        let firstPageTastings = await dataService.fetchUserTastingsPaginated(page: 0, pageSize: pageSize)
        hasMorePages = firstPageTastings.count == pageSize

        // Convert and update UI
        let newNotes = convertTastings(firstPageTastings)
        await MainActor.run {
            allNotes = newNotes
            notes = allNotes
        }
    }
}

// MARK: - Models
enum TimeFilter: String, CaseIterable, Identifiable {
    case all, today, week, month, year
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .all: return "All"
        case .today: return "Today"
        case .week: return "This Week"
        case .month: return "This Month"
        case .year: return "This Year"
        }
    }
}

struct TastingNoteWithWine: Identifiable {
    let id: UUID
    let wineName: String
    let producer: String
    let producerCity: String?
    let vintage: Int?
    let rating: Int
    let notes: String?
    let detailedNotes: String?
    let aromas: [String]
    let flavors: [String]
    let date: Date
    let imageUrl: String?
    let vintageId: UUID
    let isShared: Bool
    let sharedBy: SharedTastingInfo?
}