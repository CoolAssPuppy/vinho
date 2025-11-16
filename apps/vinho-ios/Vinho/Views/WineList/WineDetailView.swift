import SwiftUI
import MapKit

/// Sophisticated wine detail view with immersive design
struct WineDetailView: View {
    var wine: WineWithDetails
    var fromTasting: Bool = false // Track if navigated from a tasting to prevent circular nav
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    @State private var showingTastingNote = false
    @State private var isFavorite = false
    @State private var heroImageScale: CGFloat = 1.0
    @State private var tastings: [TastingNoteWithWine] = []
    @State private var isLoadingTastings = false
    @State private var selectedTasting: TastingNoteWithWine?
    @State private var showingTastingDetail = false

    // Inline editing states
    @State private var editedName: String = ""
    @State private var editedDescription: String = ""
    @State private var isEditingName = false
    @State private var isEditingDescription = false
    @State private var isSaving = false
    
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
        .sheet(isPresented: $showingTastingDetail) {
            if let tasting = selectedTasting {
                TastingNoteDetailView(
                    note: tasting,
                    onEdit: {
                        // Handle edit
                    },
                    onDelete: {
                        // Handle delete
                        Task {
                            await loadTastings()
                        }
                    }
                )
                .environmentObject(hapticManager)
            }
        }
        .onAppear {
            Task {
                await loadTastings()
            }
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

            // Wine Name (Editable)
            VStack(alignment: .leading, spacing: 8) {
                if isEditingName {
                    TextField("Wine Name", text: $editedName)
                        .font(.system(size: 32, weight: .bold, design: .serif))
                        .foregroundColor(.vinoText)
                        .textFieldStyle(.plain)
                        .onSubmit {
                            saveWineName()
                        }
                        .overlay(alignment: .trailing) {
                            Button {
                                saveWineName()
                            } label: {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(.vinoSuccess)
                            }
                            .padding(.leading, 8)
                        }
                } else {
                    Text(wine.name)
                        .font(.system(size: 32, weight: .bold, design: .serif))
                        .foregroundColor(.vinoText)
                        .onTapGesture {
                            hapticManager.lightImpact()
                            editedName = wine.name
                            isEditingName = true
                        }
                }
            }

            // Wine Description (Editable)
            if isEditingDescription || wine.description != nil || isEditingDescription {
                VStack(alignment: .leading, spacing: 8) {
                    if isEditingDescription {
                        TextEditor(text: $editedDescription)
                            .font(.system(size: 14))
                            .foregroundColor(.vinoTextSecondary)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 80)
                            .padding(8)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.vinoDarkSecondary)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.vinoBorder, lineWidth: 1)
                                    )
                            )

                        HStack {
                            Button("Cancel") {
                                hapticManager.lightImpact()
                                isEditingDescription = false
                            }
                            .foregroundColor(.vinoTextSecondary)

                            Spacer()

                            Button("Save") {
                                saveWineDescription()
                            }
                            .foregroundColor(.vinoSuccess)
                            .fontWeight(.semibold)
                            .disabled(isSaving)
                        }
                        .font(.system(size: 14))
                    } else {
                        Text(wine.description ?? "Tap to add wine description")
                            .font(.system(size: 14))
                            .foregroundColor(wine.description == nil ? .vinoTextTertiary : .vinoTextSecondary)
                            .lineSpacing(4)
                            .onTapGesture {
                                hapticManager.lightImpact()
                                editedDescription = wine.description ?? ""
                                isEditingDescription = true
                            }
                    }
                }
                .padding(.top, 4)
            }

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
            if isLoadingTastings {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(.vinoAccent)
                    Spacer()
                }
                .padding(40)
            } else if tastings.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "wineglass")
                        .font(.system(size: 40))
                        .foregroundColor(.vinoTextTertiary)
                    Text("No tastings yet")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                    Text("Add your first tasting note for this wine")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextTertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(40)
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(tastings) { tasting in
                            Button {
                                hapticManager.lightImpact()
                                selectedTasting = tasting
                                showingTastingDetail = true
                            } label: {
                                TastingRowView(tasting: tasting)
                            }
                        }
                    }
                }
                .frame(maxHeight: 400)
            }
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

    // MARK: - Data Loading
    private func loadTastings() async {
        isLoadingTastings = true
        let fetchedTastings = await DataService.shared.fetchTastingsForWine(wineId: wine.id)
        let converted = fetchedTastings.compactMap { convertToTastingNoteWithWine($0) }
        await MainActor.run {
            tastings = converted
            isLoadingTastings = false
        }
    }

    private func convertToTastingNoteWithWine(_ tasting: Tasting) -> TastingNoteWithWine? {
        guard let vintage = tasting.vintage,
              let wine = vintage.wine,
              let producer = wine.producer else {
            return nil
        }

        return TastingNoteWithWine(
            id: tasting.id,
            wineName: wine.name,
            producer: producer.name,
            producerCity: producer.city,
            vintage: vintage.year,
            rating: tasting.verdict ?? 0,
            notes: tasting.notes,
            detailedNotes: tasting.detailedNotes,
            aromas: [], // Not available in current tasting model
            flavors: [], // Not available in current tasting model
            date: tasting.tastedAt,
            imageUrl: tasting.imageUrl,
            vintageId: tasting.vintageId,
            isShared: tasting.sharedBy != nil,
            sharedBy: tasting.sharedBy
        )
    }

    // MARK: - Save Functions
    private func saveWineName() {
        guard !editedName.isEmpty else {
            isEditingName = false
            return
        }

        Task {
            isSaving = true
            hapticManager.mediumImpact()

            do {
                try await DataService.shared.updateWine(
                    id: wine.id,
                    name: editedName,
                    description: nil
                )

                // Update local state
                await MainActor.run {
                    var updatedWine = wine
                    updatedWine.name = editedName
                    isEditingName = false
                    hapticManager.success()

                    // Post notification to refresh wine list
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } catch {
                print("Error updating wine name: \(error)")
                hapticManager.error()
            }

            isSaving = false
        }
    }

    private func saveWineDescription() {
        Task {
            isSaving = true
            hapticManager.mediumImpact()

            do {
                try await DataService.shared.updateWine(
                    id: wine.id,
                    name: nil,
                    description: editedDescription.isEmpty ? nil : editedDescription
                )

                // Update local state
                await MainActor.run {
                    var updatedWine = wine
                    updatedWine.description = editedDescription.isEmpty ? nil : editedDescription
                    isEditingDescription = false
                    hapticManager.success()

                    // Post notification to refresh wine list
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } catch {
                print("Error updating wine description: \(error)")
                hapticManager.error()
            }

            isSaving = false
        }
    }
}

// MARK: - Supporting Views
struct TastingRowView: View {
    let tasting: TastingNoteWithWine

    var body: some View {
        HStack(spacing: 12) {
            // Left side - Image or placeholder
            if let imageUrl = tasting.imageUrl {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ZStack {
                        Color.vinoDarkSecondary
                        Image(systemName: "wineglass")
                            .foregroundColor(.vinoTextTertiary)
                    }
                }
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                ZStack {
                    Color.vinoDarkSecondary
                    Image(systemName: "wineglass")
                        .font(.system(size: 20))
                        .foregroundColor(.vinoTextTertiary)
                }
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Middle - Info
            VStack(alignment: .leading, spacing: 4) {
                // Stars
                HStack(spacing: 2) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < tasting.rating ? "star.fill" : "star")
                            .font(.system(size: 12))
                            .foregroundColor(index < tasting.rating ? .vinoGold : .vinoTextTertiary)
                    }
                }

                // Notes preview
                if let notes = tasting.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(size: 13))
                        .foregroundColor(.vinoTextSecondary)
                        .lineLimit(2)
                }

                // Date
                Text(formattedDate(tasting.date))
                    .font(.system(size: 11))
                    .foregroundColor(.vinoTextTertiary)
            }

            Spacer()

            // Right arrow
            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundColor(.vinoTextTertiary)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.vinoDarkSecondary)
        )
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

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