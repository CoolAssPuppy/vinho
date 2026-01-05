import SwiftUI
import Combine

/// Award-worthy wine list with sophisticated filtering and gorgeous cells
struct WineListView: View {
    @StateObject private var viewModel = WineListViewModel()
    @EnvironmentObject var hapticManager: HapticManager
    @State private var searchText = ""
    @State private var showingFilters = false
    @State private var selectedWine: WineWithDetails?
    @State private var viewMode: ViewMode = .grid
    
    enum ViewMode: String, CaseIterable {
        case grid = "square.grid.2x2"
        case list = "rectangle.grid.1x2"
        
        var columns: [GridItem] {
            switch self {
            case .grid:
                return [GridItem(.flexible()), GridItem(.flexible())]
            case .list:
                return [GridItem(.flexible())]
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Sophisticated background
                backgroundGradient
                
                VStack(spacing: 0) {
                    // Search and Filter Bar
                    searchAndFilterBar
                        .padding(.horizontal)
                        .padding(.vertical, 12)
                    
                    // View Mode Toggle
                    viewModeToggle
                        .padding(.horizontal)
                        .padding(.bottom, 8)
                    
                    // Wine Grid/List
                    ScrollView {
                        LazyVGrid(columns: viewMode.columns, spacing: 16) {
                            ForEach(filteredWines) { wine in
                                wineCell(for: wine)
                                    .onTapGesture {
                                        hapticManager.lightImpact()
                                        selectedWine = wine
                                    }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 100)
                    }
                    .refreshable {
                        hapticManager.mediumImpact()
                        await viewModel.refreshWines()
                    }
                }
            }
            .navigationTitle("Wine Collection")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        hapticManager.mediumImpact()
                        showingFilters = true
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundColor(.vinoAccent)
                    }
                }
            }
        }
        .sheet(isPresented: $showingFilters) {
            FilterSheet(viewModel: viewModel)
                .environmentObject(hapticManager)
        }
        .sheet(item: $selectedWine) { wine in
            WineDetailView(wine: wine)
                .environmentObject(hapticManager)
        }
        .onAppear {
            Task {
                await viewModel.loadWines()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("WineDataChanged"))) { _ in
            Task {
                await viewModel.refreshWines()
            }
        }
    }
    
    var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color.vinoDark,
                Color.vinoPrimary.opacity(0.05),
                Color.vinoDark
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    var searchAndFilterBar: some View {
        HStack(spacing: 12) {
            // Search Field
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.vinoTextSecondary)
                
                TextField("Search wines, producers, regions...", text: $searchText)
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
    }
    
    var viewModeToggle: some View {
        HStack {
            Text("\(filteredWines.count) wines")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
            
            Spacer()
            
            Picker("", selection: $viewMode) {
                ForEach(ViewMode.allCases, id: \.self) { mode in
                    Image(systemName: mode.rawValue)
                        .tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 100)
        }
    }
    
    @ViewBuilder
    func wineCell(for wine: WineWithDetails) -> some View {
        if viewMode == .grid {
            WineGridCell(wine: wine)
        } else {
            WineListCell(wine: wine)
        }
    }
    
    var filteredWines: [WineWithDetails] {
        viewModel.wines.filter { wine in
            if searchText.isEmpty { return true }
            let searchLower = searchText.lowercased()
            return wine.name.lowercased().contains(searchLower) ||
                   wine.producer.lowercased().contains(searchLower) ||
                   wine.region?.lowercased().contains(searchLower) ?? false ||
                   wine.varietal?.lowercased().contains(searchLower) ?? false
        }
    }
}

// MARK: - Wine Grid Cell
struct WineGridCell: View {
    let wine: WineWithDetails
    @State private var imageLoaded = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Wine Image
            ZStack {
                if let imageUrl = wine.imageUrl {
                    AsyncImage(url: URL(string: imageUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(height: 200)
                                .clipped()
                                .opacity(imageLoaded ? 1 : 0)
                                .onAppear {
                                    withAnimation(.easeIn(duration: 0.3)) {
                                        imageLoaded = true
                                    }
                                }
                        case .empty, .failure:
                            wineImagePlaceholder
                        @unknown default:
                            wineImagePlaceholder
                        }
                    }
                } else {
                    wineImagePlaceholder
                }
                
                // Rating Badge
                if let rating = wine.averageRating {
                    VStack {
                        HStack {
                            Spacer()
                            RatingBadge(rating: rating)
                                .padding(8)
                        }
                        Spacer()
                    }
                }
            }
            .frame(height: 200)
            
            // Wine Info
            VStack(alignment: .leading, spacing: 8) {
                Text(wine.producer)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                    .textCase(.uppercase)
                    .lineLimit(1)
                
                Text(wine.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.vinoText)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                
                if let year = wine.year {
                    Text(String(year))
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextSecondary)
                }
                
                Spacer()
                
                // Price
                if let price = wine.price {
                    Text("$\(price, specifier: "%.0f")")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.vinoGold)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
    }
    
    var wineImagePlaceholder: some View {
        ZStack {
            LinearGradient(
                colors: [Color.vinoPrimary.opacity(0.3), Color.vinoDarkSecondary],
                startPoint: .top,
                endPoint: .bottom
            )
            
            Image(systemName: "wineglass")
                .font(.system(size: 50))
                .foregroundColor(.vinoPrimary.opacity(0.3))
        }
    }
}

// MARK: - Wine List Cell
struct WineListCell: View {
    let wine: WineWithDetails
    @State private var imageLoaded = false
    
    var body: some View {
        HStack(spacing: 16) {
            // Wine Image
            ZStack {
                if let imageUrl = wine.imageUrl {
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
                        Color.vinoDarkSecondary
                        Image(systemName: "wineglass")
                            .font(.system(size: 30))
                            .foregroundColor(.vinoPrimary.opacity(0.3))
                    }
                }
            }
            .frame(width: 100, height: 120)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            
            // Wine Details
            VStack(alignment: .leading, spacing: 6) {
                Text(wine.producer)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                    .textCase(.uppercase)
                
                Text(wine.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.vinoText)
                    .lineLimit(2)
                
                if let year = wine.year {
                    Text("\(year) · \(wine.region ?? "")")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextSecondary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                HStack {
                    // Rating
                    if let rating = wine.averageRating {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.vinoGold)
                            Text(String(format: "%.1f", rating))
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.vinoText)
                        }
                    }
                    
                    Spacer()
                    
                    // Price
                    if let price = wine.price {
                        Text("$\(price, specifier: "%.0f")")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.vinoGold)
                    }
                }
            }
            .padding(.vertical, 8)
            
            Spacer()
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.vinoDarkSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.vinoBorder, lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Filter Sheet
struct FilterSheet: View {
    @ObservedObject var viewModel: WineListViewModel
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Wine Type
                        FilterSection(title: "Wine Type") {
                            ForEach(WineType.allCases, id: \.self) { type in
                                FilterChip(
                                    title: type.rawValue,
                                    isSelected: viewModel.selectedTypes.contains(type)
                                ) {
                                    hapticManager.selection()
                                    viewModel.toggleType(type)
                                }
                            }
                        }
                        
                        // Price Range
                        FilterSection(title: "Price Range") {
                            PriceRangeSlider(
                                range: $viewModel.priceRange,
                                maxPrice: 500
                            )
                        }
                        
                        // Rating
                        FilterSection(title: "Minimum Rating") {
                            RatingSelector(rating: $viewModel.minimumRating)
                        }
                        
                        // Region
                        FilterSection(title: "Region") {
                            ForEach(viewModel.availableRegions, id: \.self) { region in
                                FilterChip(
                                    title: region,
                                    isSelected: viewModel.selectedRegions.contains(region)
                                ) {
                                    hapticManager.selection()
                                    viewModel.toggleRegion(region)
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Clear") {
                        hapticManager.lightImpact()
                        viewModel.clearFilters()
                    }
                    .foregroundColor(.vinoAccent)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        hapticManager.mediumImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

// MARK: - Filter Components
struct FilterSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            content()
        }
    }
}

struct PriceRangeSlider: View {
    @Binding var range: ClosedRange<Double>
    let maxPrice: Double
    
    var body: some View {
        VStack {
            HStack {
                Text("$\(Int(range.lowerBound))")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.vinoText)
                Spacer()
                Text("$\(Int(range.upperBound))")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.vinoText)
            }
            
            // Custom range slider would go here
            // For now, using a simple representation
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.vinoDarkSecondary)
                        .frame(height: 4)
                    
                    Capsule()
                        .fill(LinearGradient.vinoGradient)
                        .frame(
                            width: geometry.size.width * CGFloat((range.upperBound - range.lowerBound) / maxPrice),
                            height: 4
                        )
                        .offset(x: geometry.size.width * CGFloat(range.lowerBound / maxPrice))
                }
            }
            .frame(height: 20)
        }
    }
}

struct RatingSelector: View {
    @Binding var rating: Double
    
    var body: some View {
        HStack(spacing: 8) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= Int(rating) ? "star.fill" : "star")
                    .font(.system(size: 24))
                    .foregroundColor(star <= Int(rating) ? .vinoGold : .vinoTextTertiary)
                    .onTapGesture {
                        rating = Double(star)
                    }
            }
        }
    }
}

// MARK: - View Model
@MainActor
class WineListViewModel: ObservableObject {
    @Published var wines: [WineWithDetails] = []
    @Published var isLoading = false
    @Published var selectedTypes: Set<WineType> = []
    @Published var selectedRegions: Set<String> = []
    @Published var priceRange: ClosedRange<Double> = 0...500
    @Published var minimumRating: Double = 0

    private let dataService = DataService.shared

    var availableRegions: [String] {
        Array(Set(wines.compactMap { $0.region })).sorted()
    }

    func loadWines() async {
        isLoading = true
        await dataService.fetchWines()

        // Convert to WineWithDetails format
        wines = dataService.wines.map { wine in
            // Parse wine type from enriched data
            var wineType: WineType = .red
            if let typeString = wine.wineType?.lowercased() {
                switch typeString {
                case "white": wineType = .white
                case "rosé", "rose": wineType = .rose
                case "sparkling": wineType = .sparkling
                case "dessert", "fortified": wineType = .dessert
                default: wineType = .red
                }
            } else if wine.isNV {
                wineType = .sparkling
            }

            let firstVintage = wine.vintages?.first
            return WineWithDetails(
                id: wine.id,
                name: wine.name,
                producer: wine.producer?.name ?? "Unknown",
                year: firstVintage?.year,
                region: wine.producer?.region?.name,
                varietal: wine.varietal,
                price: nil,
                averageRating: nil,
                imageUrl: nil,
                type: wineType,
                description: wine.tastingNotes,
                servingTemperature: wine.servingTemperature,
                foodPairings: wine.foodPairings,
                style: wine.style,
                color: wine.color,
                vintageId: firstVintage?.id,
                communityRating: firstVintage?.communityRating,
                communityRatingCount: firstVintage?.communityRatingCount
            )
        }
        isLoading = false
    }

    func refreshWines() async {
        await loadWines()
    }
    
    func toggleType(_ type: WineType) {
        if selectedTypes.contains(type) {
            selectedTypes.remove(type)
        } else {
            selectedTypes.insert(type)
        }
    }
    
    func toggleRegion(_ region: String) {
        if selectedRegions.contains(region) {
            selectedRegions.remove(region)
        } else {
            selectedRegions.insert(region)
        }
    }
    
    func clearFilters() {
        selectedTypes.removeAll()
        selectedRegions.removeAll()
        priceRange = 0...500
        minimumRating = 0
    }
}

// MARK: - Models
enum WineType: String, CaseIterable {
    case red = "Red"
    case white = "White"
    case rose = "Rosé"
    case sparkling = "Sparkling"
    case dessert = "Dessert"

    var color: Color {
        switch self {
        case .red:
            return Color(red: 0.5, green: 0.1, blue: 0.1)
        case .white:
            return Color(red: 0.9, green: 0.85, blue: 0.6)
        case .rose:
            return Color(red: 0.95, green: 0.75, blue: 0.75)
        case .sparkling:
            return Color(red: 0.95, green: 0.9, blue: 0.7)
        case .dessert:
            return Color(red: 0.8, green: 0.6, blue: 0.3)
        }
    }
}

struct WineWithDetails: Identifiable {
    let id: UUID  // Wine ID from database
    var name: String
    var producer: String
    let year: Int?
    let region: String?
    var varietal: String?
    let price: Double?
    let averageRating: Double?
    let imageUrl: String?
    var type: WineType
    var description: String?  // Wine description from tasting_notes
    var servingTemperature: String?
    var foodPairings: [String]?
    var style: String?
    var color: String?
    var vintageId: UUID?  // For varietal storage
    let communityRating: Double?  // Average rating from all users
    let communityRatingCount: Int?  // Number of ratings
}