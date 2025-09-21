import SwiftUI
import MapKit

/// Sophisticated wine detail view with immersive design
struct WineDetailView: View {
    let wine: WineWithDetails
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    @State private var showingTastingNote = false
    @State private var isFavorite = false
    @State private var heroImageScale: CGFloat = 1.0
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 0) {
                        // Hero Section with Parallax
                        heroSection
                        
                        // Main Content
                        VStack(spacing: 24) {
                            // Wine Header
                            wineHeader
                            
                            // Quick Stats
                            quickStats
                            
                            // Tabbed Content
                            tabbedContent
                            
                            // Action Buttons
                            actionButtons
                            
                            Spacer(minLength: 100)
                        }
                        .padding(20)
                        .background(
                            RoundedRectangle(cornerRadius: 30, style: .continuous)
                                .fill(Color.vinoDarkSecondary)
                                .shadow(color: .black.opacity(0.3), radius: 30, x: 0, y: -15)
                        )
                        .offset(y: -30)
                    }
                }
                .ignoresSafeArea(edges: .top)
            }
            .navigationBarHidden(true)
            .overlay(alignment: .topLeading) {
                // Custom Navigation Bar
                customNavigationBar
            }
        }
        .sheet(isPresented: $showingTastingNote) {
            AddTastingNoteView(wine: wine)
                .environmentObject(hapticManager)
        }
    }
    
    var heroSection: some View {
        GeometryReader { geometry in
            ZStack {
                // Background Image or Gradient
                if let imageUrl = wine.imageUrl {
                    AsyncImage(url: URL(string: imageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        shimmerBackground
                    }
                } else {
                    elegantGradientBackground
                }
                
                // Overlay Gradient
                LinearGradient(
                    colors: [
                        Color.clear,
                        Color.vinoDark.opacity(0.3),
                        Color.vinoDark.opacity(0.7),
                        Color.vinoDark
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                
                // Wine Bottle Illustration
                VStack {
                    Spacer()
                    Image(systemName: "wineglass")
                        .font(.system(size: 100))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.vinoGold, Color.vinoPrimary],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
                        .scaleEffect(heroImageScale)
                        .onAppear {
                            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                                heroImageScale = 1.1
                            }
                        }
                    Spacer()
                }
            }
            .frame(
                width: geometry.size.width,
                height: max(400 + geometry.frame(in: .global).minY, 400)
            )
            .clipped()
            .offset(y: -geometry.frame(in: .global).minY)
        }
        .frame(height: 400)
    }
    
    var shimmerBackground: some View {
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
    
    var elegantGradientBackground: some View {
        LinearGradient(
            colors: [
                wine.type.color.opacity(0.4),
                Color.vinoDarkSecondary
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }
    
    var customNavigationBar: some View {
        HStack {
            Button {
                hapticManager.lightImpact()
                dismiss()
            } label: {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white, Color.black.opacity(0.3))
                    .background(Circle().fill(Color.black.opacity(0.2)))
            }
            
            Spacer()
            
            Button {
                hapticManager.mediumImpact()
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    isFavorite.toggle()
                }
            } label: {
                Image(systemName: isFavorite ? "heart.fill" : "heart")
                    .font(.system(size: 28))
                    .foregroundColor(isFavorite ? .vinoError : .white)
                    .background(
                        Circle()
                            .fill(Color.black.opacity(0.2))
                            .frame(width: 44, height: 44)
                    )
            }
            .scaleEffect(isFavorite ? 1.2 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isFavorite)
        }
        .padding(.horizontal, 20)
        .padding(.top, 50)
    }
    
    var wineHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Producer
            Text(wine.producer)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.vinoAccent)
                .textCase(.uppercase)
                .tracking(1.2)
            
            // Wine Name
            Text(wine.name)
                .font(.system(size: 32, weight: .bold, design: .serif))
                .foregroundColor(.vinoText)
            
            // Vintage & Region
            HStack(spacing: 16) {
                if let year = wine.year {
                    Label {
                        Text(String(year))
                            .font(.system(size: 16, weight: .medium))
                    } icon: {
                        Image(systemName: "calendar")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(.vinoTextSecondary)
                }
                
                if let region = wine.region {
                    Label {
                        Text(region)
                            .font(.system(size: 16, weight: .medium))
                    } icon: {
                        Image(systemName: "location")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(.vinoTextSecondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    var quickStats: some View {
        HStack(spacing: 0) {
            // Rating
            if let rating = wine.averageRating {
                StatCard(
                    icon: "star.fill",
                    value: String(format: "%.1f", rating),
                    label: "Rating",
                    color: .vinoGold
                )
            }
            
            Divider()
                .frame(height: 40)
                .background(Color.vinoBorder)
            
            // Price
            if let price = wine.price {
                StatCard(
                    icon: "dollarsign.circle.fill",
                    value: "$\(Int(price))",
                    label: "Price",
                    color: .vinoSuccess
                )
            }
            
            Divider()
                .frame(height: 40)
                .background(Color.vinoBorder)
            
            // Type
            StatCard(
                icon: "drop.fill",
                value: wine.type.rawValue,
                label: "Type",
                color: wine.type.color
            )
        }
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDark)
        )
    }
    
    var tabbedContent: some View {
        VStack(spacing: 16) {
            // Tab Selector
            HStack(spacing: 0) {
                ForEach(0..<3) { index in
                    TabButton(
                        title: ["Details", "Tasting", "Pairings"][index],
                        isSelected: selectedTab == index
                    ) {
                        hapticManager.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedTab = index
                        }
                    }
                }
            }
            .padding(4)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.vinoDark)
            )
            
            // Tab Content
            switch selectedTab {
            case 0:
                detailsTab
            case 1:
                tastingTab
            case 2:
                pairingsTab
            default:
                EmptyView()
            }
        }
    }
    
    var detailsTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            InfoRow(label: "Varietal", value: wine.varietal ?? "Blend")
            InfoRow(label: "Alcohol", value: "13.5% ABV")
            InfoRow(label: "Serving Temp", value: "16-18°C")
            InfoRow(label: "Decant", value: "30 minutes")
            
            Text("About This Wine")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
                .padding(.top, 8)
            
            Text("This exceptional vintage showcases the terroir's unique characteristics, with careful vineyard management and traditional winemaking techniques creating a wine of remarkable complexity and elegance.")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
                .lineSpacing(4)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }
    
    var tastingTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            TastingAspect(
                title: "Appearance",
                description: "Deep ruby with purple reflections",
                icon: "eye"
            )
            
            TastingAspect(
                title: "Nose",
                description: "Blackcurrant, violet, cedar, tobacco, graphite",
                icon: "nose"
            )
            
            TastingAspect(
                title: "Palate",
                description: "Full-bodied with silky tannins, dark fruits, spice, and mineral notes",
                icon: "mouth"
            )
            
            TastingAspect(
                title: "Finish",
                description: "Long and persistent with evolving complexity",
                icon: "timer"
            )
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }
    
    var pairingsTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Perfect Pairings")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            ForEach(["Grilled ribeye steak", "Lamb rack with herbs", "Aged hard cheeses", "Dark chocolate"], id: \.self) { pairing in
                HStack(spacing: 12) {
                    Image(systemName: "fork.knife")
                        .font(.system(size: 16))
                        .foregroundColor(.vinoAccent)
                    Text(pairing)
                        .font(.system(size: 14))
                        .foregroundColor(.vinoText)
                    Spacer()
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.vinoDarkSecondary)
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }
    
    var actionButtons: some View {
        VStack(spacing: 12) {
            Button {
                hapticManager.mediumImpact()
                showingTastingNote = true
            } label: {
                HStack {
                    Image(systemName: "pencil.and.list.clipboard")
                    Text("Add Tasting Note")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(LinearGradient.vinoGradient)
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .vinoPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
            }
            
            HStack(spacing: 12) {
                Button {
                    hapticManager.lightImpact()
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.vinoDark)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.vinoBorder, lineWidth: 1)
                                )
                        )
                        .foregroundColor(.vinoText)
                }
                
                Button {
                    hapticManager.lightImpact()
                } label: {
                    Image(systemName: "plus.circle")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.vinoDark)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.vinoBorder, lineWidth: 1)
                                )
                        )
                        .foregroundColor(.vinoText)
                }
            }
        }
    }
}

// MARK: - Supporting Views
struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)
            
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.vinoText)
            
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.vinoTextSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isSelected ? AnyShapeStyle(LinearGradient.vinoGradient) : AnyShapeStyle(Color.clear))
                )
                .foregroundColor(isSelected ? .white : .vinoTextSecondary)
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoText)
        }
    }
}

struct TastingAspect: View {
    let title: String
    let description: String
    let icon: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.vinoAccent)
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.vinoText)
                
                Text(description)
                    .font(.system(size: 13))
                    .foregroundColor(.vinoTextSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
    }
}

// MARK: - Add Tasting Note View
struct AddTastingNoteView: View {
    let wine: WineWithDetails
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 3
    @State private var notes = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Wine Info
                        VStack(alignment: .leading, spacing: 8) {
                            Text(wine.producer)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.vinoAccent)
                                .textCase(.uppercase)
                            
                            Text(wine.name)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.vinoText)
                            
                            if let year = wine.year {
                                Text("\(year) · \(wine.region ?? "")")
                                    .font(.system(size: 14))
                                    .foregroundColor(.vinoTextSecondary)
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.vinoDarkSecondary)
                        )
                        
                        // Rating
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Your Rating")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.vinoText)
                            
                            HStack(spacing: 12) {
                                ForEach(1...5, id: \.self) { star in
                                    Image(systemName: star <= rating ? "star.fill" : "star")
                                        .font(.system(size: 32))
                                        .foregroundColor(star <= rating ? .vinoGold : .vinoTextTertiary)
                                        .onTapGesture {
                                            hapticManager.lightImpact()
                                            rating = star
                                        }
                                }
                            }
                        }
                        
                        // Tasting Notes
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Tasting Notes")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.vinoText)
                            
                            TextEditor(text: $notes)
                                .font(.system(size: 16))
                                .foregroundColor(.vinoText)
                                .scrollContentBackground(.hidden)
                                .padding(12)
                                .frame(minHeight: 150)
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
                    .padding()
                }
            }
            .navigationTitle("Add Tasting Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        hapticManager.lightImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        hapticManager.success()
                        // Save tasting note
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}