import SwiftUI
import Combine

struct FeedView: View {
    @StateObject private var viewModel = FeedViewModel()
    @EnvironmentObject var hapticManager: HapticManager
    @State private var searchText = ""
    @State private var isSearching = false
    @State private var selectedFilter: FeedFilter = .all
    @State private var showingDetail = false
    @State private var selectedItem: FeedItem?
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 0) {
                        // Search Bar
                        searchBar
                            .padding(.horizontal)
                            .padding(.top, 16)
                        
                        // Filter Pills
                        filterSection
                            .padding(.vertical, 16)
                        
                        // Feed Items
                        LazyVStack(spacing: 16) {
                            ForEach(filteredItems) { item in
                                FeedItemCard(item: item)
                                    .onTapGesture {
                                        hapticManager.lightImpact()
                                        selectedItem = item
                                        showingDetail = true
                                    }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 100)
                    }
                }
                .refreshable {
                    hapticManager.mediumImpact()
                    await viewModel.refreshFeed()
                }
            }
            .navigationTitle("Your Feed")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(item: $selectedItem) { item in
            FeedDetailView(item: item)
                .environmentObject(hapticManager)
        }
        .onAppear {
            Task {
                await viewModel.loadFeed()
            }
        }
    }
    
    var searchBar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.vinoTextSecondary)
                
                TextField("Search wines, tastings, or insights...", text: $searchText)
                    .font(.system(size: 16))
                    .foregroundColor(.vinoText)
                    .onSubmit {
                        hapticManager.lightImpact()
                    }
                
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
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDarkSecondary)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.vinoBorder, lineWidth: 1)
                    )
            )
        }
    }
    
    var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(FeedFilter.allCases) { filter in
                    FilterPill(
                        title: filter.title,
                        icon: filter.icon,
                        isSelected: selectedFilter == filter
                    ) {
                        hapticManager.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedFilter = filter
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    var filteredItems: [FeedItem] {
        let items = viewModel.feedItems
        
        // Apply filter
        let filtered = switch selectedFilter {
        case .all:
            items
        case .wines:
            items.filter { $0.type == .wine }
        case .tastings:
            items.filter { $0.type == .tasting }
        case .insights:
            items.filter { $0.type == .insight }
        case .recommendations:
            items.filter { $0.type == .recommendation }
        }
        
        // Apply search
        if searchText.isEmpty {
            return filtered
        } else {
            return filtered.filter { item in
                item.title.localizedCaseInsensitiveContains(searchText) ||
                item.description.localizedCaseInsensitiveContains(searchText) ||
                item.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }
    }
}

// MARK: - Feed Item Card
struct FeedItemCard: View {
    let item: FeedItem
    @State private var imageOpacity = 0.0
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image Section
            if let imageUrl = item.imageUrl {
                AsyncImage(url: URL(string: imageUrl)) { phase in
                    switch phase {
                    case .empty:
                        shimmerPlaceholder
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 200)
                            .clipped()
                            .opacity(imageOpacity)
                            .onAppear {
                                withAnimation(.easeIn(duration: 0.3)) {
                                    imageOpacity = 1.0
                                }
                            }
                    case .failure(_):
                        imagePlaceholder
                    @unknown default:
                        shimmerPlaceholder
                    }
                }
                .frame(height: 200)
                .background(Color.vinoDarkSecondary)
            }
            
            // Content Section
            VStack(alignment: .leading, spacing: 12) {
                // Type Badge & Time
                HStack {
                    TypeBadge(type: item.type)
                    
                    Spacer()
                    
                    Text(item.timestamp.timeAgo())
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                }
                
                // Title
                Text(item.title)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.vinoText)
                    .lineLimit(2)
                
                // Description
                Text(item.description)
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)
                    .lineLimit(3)
                
                // Tags
                if !item.tags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(item.tags, id: \.self) { tag in
                                TagView(text: tag)
                            }
                        }
                    }
                }
                
                // Engagement Bar
                HStack(spacing: 20) {
                    EngagementButton(
                        icon: item.isLiked ? "heart.fill" : "heart",
                        count: item.likeCount,
                        color: item.isLiked ? .vinoError : .vinoTextSecondary
                    )
                    
                    EngagementButton(
                        icon: "bubble.left",
                        count: item.commentCount,
                        color: .vinoTextSecondary
                    )
                    
                    EngagementButton(
                        icon: "bookmark",
                        count: nil,
                        color: item.isSaved ? .vinoAccent : .vinoTextSecondary
                    )
                    
                    Spacer()
                    
                    Button {
                        // Share action
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
                .padding(.top, 4)
            }
            .padding(16)
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
    }
    
    var shimmerPlaceholder: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [
                        Color.vinoDarkSecondary,
                        Color.vinoDarkSecondary.opacity(0.6),
                        Color.vinoDarkSecondary
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .shimmer()
    }
    
    var imagePlaceholder: some View {
        ZStack {
            Color.vinoDarkSecondary
            Image(systemName: "photo")
                .font(.system(size: 40))
                .foregroundColor(.vinoTextTertiary)
        }
    }
}

// MARK: - Supporting Views
struct FilterPill: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                Text(title)
                    .font(.system(size: 14, weight: .medium))
            }
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

struct TypeBadge: View {
    let type: FeedItemType
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: type.icon)
                .font(.system(size: 10, weight: .semibold))
            Text(type.label)
                .font(.system(size: 10, weight: .semibold))
                .textCase(.uppercase)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(type.color.opacity(0.2))
                .overlay(
                    Capsule()
                        .stroke(type.color, lineWidth: 1)
                )
        )
        .foregroundColor(type.color)
    }
}

struct TagView: View {
    let text: String
    
    var body: some View {
        Text("#\(text)")
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.vinoAccent)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(Color.vinoAccent.opacity(0.1))
            )
    }
}

struct EngagementButton: View {
    let icon: String
    let count: Int?
    let color: Color
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
            if let count = count, count > 0 {
                Text("\(count)")
                    .font(.system(size: 12, weight: .medium))
            }
        }
        .foregroundColor(color)
    }
}

// MARK: - View Model
@MainActor
class FeedViewModel: ObservableObject {
    @Published var feedItems: [FeedItem] = []
    @Published var isLoading = false
    @Published var error: String?

    private let dataService = DataService.shared

    func loadFeed() async {
        isLoading = true
        feedItems = await dataService.fetchRecentActivity()
        isLoading = false
    }

    func refreshFeed() async {
        await loadFeed()
    }
}

// MARK: - Models
enum FeedFilter: String, CaseIterable, Identifiable {
    case all, wines, tastings, insights, recommendations
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .all: return "All"
        case .wines: return "Wines"
        case .tastings: return "Tastings"
        case .insights: return "Insights"
        case .recommendations: return "For You"
        }
    }
    
    var icon: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .wines: return "wineglass"
        case .tastings: return "pencil.and.list.clipboard"
        case .insights: return "lightbulb"
        case .recommendations: return "star"
        }
    }
}

enum FeedItemType {
    case wine, tasting, insight, recommendation
    
    var label: String {
        switch self {
        case .wine: return "Wine"
        case .tasting: return "Tasting"
        case .insight: return "Insight"
        case .recommendation: return "For You"
        }
    }
    
    var icon: String {
        switch self {
        case .wine: return "wineglass.fill"
        case .tasting: return "note.text"
        case .insight: return "lightbulb.fill"
        case .recommendation: return "star.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .wine: return .vinoPrimary
        case .tasting: return .vinoAccent
        case .insight: return .vinoSuccess
        case .recommendation: return .vinoGold
        }
    }
}

struct FeedItem: Identifiable {
    let id = UUID()
    let type: FeedItemType
    let title: String
    let description: String
    let imageUrl: String?
    let tags: [String]
    let timestamp: Date
    let likeCount: Int
    let commentCount: Int
    let isLiked: Bool
    let isSaved: Bool
}

// MARK: - Extensions
extension Date {
    func timeAgo() -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: Date())
    }
}

// MARK: - Shimmer Modifier
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [
                        Color.clear,
                        Color.white.opacity(0.1),
                        Color.clear
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase * 200 - 100)
                .mask(content)
            )
            .onAppear {
                withAnimation(
                    Animation.linear(duration: 1.5)
                        .repeatForever(autoreverses: false)
                ) {
                    phase = 2
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}