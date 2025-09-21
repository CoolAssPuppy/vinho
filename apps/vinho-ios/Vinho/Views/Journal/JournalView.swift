import SwiftUI

/// Beautiful journal view for wine tasting notes
struct JournalView: View {
    @StateObject private var viewModel = JournalViewModel()
    @EnvironmentObject var hapticManager: HapticManager
    @State private var selectedNote: TastingNoteWithWine?
    @State private var showingNewNote = false
    @State private var selectedTimeFilter = TimeFilter.all
    @State private var searchText = ""

    var body: some View {
        ZStack {
            // Background
            Color.vinoDark
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Search Bar
                searchBar
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .padding(.bottom, 12)

                // Time Filter
                timeFilterBar
                    .padding(.horizontal)
                    .padding(.bottom, 12)

                // Journal Entries
                if filteredNotes.isEmpty {
                    emptyState
                } else {
                    journalList
                }
            }
        }
        .sheet(item: $selectedNote) { note in
            TastingNoteDetailView(note: note)
                .environmentObject(hapticManager)
        }
        .sheet(isPresented: $showingNewNote) {
            NewTastingNoteView()
                .environmentObject(hapticManager)
        }
        .onAppear {
            Task {
                await viewModel.loadNotes()
            }
        }
    }
    
    
    var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
            
            TextField("Search notes, wines, or flavors...", text: $searchText)
                .font(.system(size: 16))
                .foregroundColor(.vinoText)
            
            if !searchText.isEmpty {
                Button {
                    hapticManager.lightImpact()
                    searchText = ""
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
                                    selectedNote = note
                                }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
        .refreshable {
            hapticManager.mediumImpact()
            await viewModel.refreshNotes()
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
        viewModel.notes.filter { note in
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
            
            guard passesTimeFilter else { return false }
            
            // Apply search filter
            if searchText.isEmpty { return true }
            
            let searchLower = searchText.lowercased()
            return note.wineName.lowercased().contains(searchLower) ||
                   note.producer.lowercased().contains(searchLower) ||
                   note.notes?.lowercased().contains(searchLower) ?? false ||
                   note.aromas.contains { $0.lowercased().contains(searchLower) } ||
                   note.flavors.contains { $0.lowercased().contains(searchLower) }
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
                // Wine Info
                Text(note.producer)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                    .textCase(.uppercase)
                    .lineLimit(1)
                
                Text(note.wineName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)
                    .lineLimit(1)
                
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

// MARK: - View Model
@MainActor
class JournalViewModel: ObservableObject {
    @Published var notes: [TastingNoteWithWine] = []
    @Published var isLoading = false

    private let dataService = DataService.shared

    func loadNotes() async {
        isLoading = true
        await dataService.fetchUserTastings()

        // Convert tastings to TastingNoteWithWine format
        notes = dataService.tastings.compactMap { tasting in
            guard let vintage = tasting.vintage,
                  let wine = vintage.wine,
                  let producer = wine.producer else { return nil }

            return TastingNoteWithWine(
                id: tasting.id,
                wineName: wine.name,
                producer: producer.name,
                vintage: vintage.year,
                rating: Int(tasting.verdict ?? 0),
                notes: tasting.notes,
                aromas: [], // You can parse these from notes if needed
                flavors: [], // You can parse these from notes if needed
                date: tasting.tastedAt,
                imageUrl: nil
            )
        }
        isLoading = false
    }

    func refreshNotes() async {
        await loadNotes()
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
    let vintage: Int?
    let rating: Int
    let notes: String?
    let aromas: [String]
    let flavors: [String]
    let date: Date
    let imageUrl: String?
}