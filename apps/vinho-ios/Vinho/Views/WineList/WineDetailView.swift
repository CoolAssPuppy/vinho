import SwiftUI
import MapKit
import Supabase

/// Sophisticated wine detail view with immersive design
struct WineDetailView: View {
    let initialWine: WineWithDetails
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

    // Wine state that can be updated
    @State private var wine: WineWithDetails

    // Inline editing states
    @State private var editedName: String = ""
    @State private var editedDescription: String = ""
    @State private var editedProducer: String = ""
    @State private var isEditingName = false
    @State private var isEditingDescription = false
    @State private var isEditingProducer = false
    @State private var isSaving = false

    // Wine details editing
    @State private var editedVarietal: String = ""
    @State private var editedServingTemp: String = ""
    @State private var editedStyle: String = ""
    @State private var isEditingVarietal = false
    @State private var isEditingServingTemp = false
    @State private var isEditingStyle = false
    @State private var isEnrichingWithAI = false

    // Expert rating
    @State private var expertRating: ExpertRating?
    @State private var isLoadingExpertRating = false
    @State private var hasAttemptedExpertRatingFetch = false

    init(wine: WineWithDetails, fromTasting: Bool = false) {
        self.initialWine = wine
        self.fromTasting = fromTasting
        self._wine = State(initialValue: wine)
    }
    
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

                            // Expert Rating Section
                            expertRatingSection

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
        .task {
            // Fetch expert rating when view appears
            guard !hasAttemptedExpertRatingFetch else { return }
            guard let vintageId = wine.vintageId else { return }
            hasAttemptedExpertRatingFetch = true
            await fetchExpertRating(vintageId: vintageId)
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
            // Producer (Editable)
            if isEditingProducer {
                HStack {
                    TextField("Producer Name", text: $editedProducer)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.vinoAccent)
                        .textCase(.uppercase)
                        .tracking(1.2)
                        .textFieldStyle(.plain)
                        .onSubmit {
                            saveProducerName()
                        }

                    Button {
                        saveProducerName()
                    } label: {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.vinoSuccess)
                    }

                    Button {
                        hapticManager.lightImpact()
                        isEditingProducer = false
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
            } else {
                Text(wine.producer)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                    .textCase(.uppercase)
                    .tracking(1.2)
                    .onTapGesture {
                        hapticManager.lightImpact()
                        editedProducer = wine.producer
                        isEditingProducer = true
                    }
            }

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
            // Community Rating
            if let communityRating = wine.communityRating, let count = wine.communityRatingCount, count > 0 {
                StatCard(
                    icon: "person.2.fill",
                    value: String(format: "%.1f", communityRating),
                    label: "\(count) rating\(count == 1 ? "" : "s")",
                    color: .vinoAccent
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.vinoBorder)
            }

            // Price
            if let price = wine.price {
                StatCard(
                    icon: "dollarsign.circle.fill",
                    value: "$\(Int(price))",
                    label: "Price",
                    color: .vinoSuccess
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.vinoBorder)
            }

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

    @ViewBuilder
    var expertRatingSection: some View {
        // Show side-by-side ratings if we have any data
        let hasExpertRating = expertRating?.rating != nil
        let hasCommunityRating = wine.communityRating != nil

        if isLoadingExpertRating || hasExpertRating || hasCommunityRating {
            HStack(spacing: 12) {
                // Vivino Rating Box - Tappable to refresh
                VStack(spacing: 8) {
                    Text("Vivino Rating")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                        .textCase(.uppercase)

                    if isLoadingExpertRating {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .vinoAccent))
                            .frame(height: 32)
                        Text("Loading...")
                            .font(.system(size: 10))
                            .foregroundColor(.vinoTextTertiary)
                    } else if let rating = expertRating, let ratingValue = rating.rating {
                        Text(String(format: "%.1f", ratingValue))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.vinoText)

                        if let ratingCount = rating.ratingCount {
                            Text("\(formatRatingCount(ratingCount)) ratings")
                                .font(.system(size: 10))
                                .foregroundColor(.vinoTextTertiary)
                        }
                    } else {
                        Text("-")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.vinoTextTertiary)

                        Text("Not available")
                            .font(.system(size: 10))
                            .foregroundColor(.vinoTextTertiary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDark)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.vinoGold.opacity(0.2), lineWidth: 1)
                        )
                )
                .contentShape(Rectangle())
                .onTapGesture {
                    hapticManager.lightImpact()
                    if let vintageId = wine.vintageId {
                        Task {
                            await fetchExpertRating(vintageId: vintageId, forceRefresh: true)
                        }
                    }
                }

                // Vinho Rating Box (Community Rating) - Tappable to refresh
                VStack(spacing: 8) {
                    Text("Vinho Rating")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                        .textCase(.uppercase)

                    if let communityRating = wine.communityRating {
                        Text(String(format: "%.1f", communityRating))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.vinoText)

                        Text("Community average")
                            .font(.system(size: 10))
                            .foregroundColor(.vinoTextTertiary)
                    } else {
                        Text("-")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.vinoTextTertiary)

                        Text("No ratings yet")
                            .font(.system(size: 10))
                            .foregroundColor(.vinoTextTertiary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDark)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.vinoAccent.opacity(0.2), lineWidth: 1)
                        )
                )
                .contentShape(Rectangle())
                .onTapGesture {
                    hapticManager.lightImpact()
                    if let vintageId = wine.vintageId {
                        Task {
                            await fetchExpertRating(vintageId: vintageId, forceRefresh: true)
                        }
                    }
                }
            }
        }
        // If no ratings at all and not loading, show nothing
    }

    private func formatRatingCount(_ count: Int) -> String {
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        } else {
            return "\(count)"
        }
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
            // Editable Varietal
            EditableInfoRow(
                label: "Varietal",
                value: wine.varietal ?? "Tap to add",
                isEditing: $isEditingVarietal,
                editedValue: $editedVarietal,
                placeholder: "e.g., Pinot Noir, Chardonnay"
            ) {
                saveWineField(field: "varietal", value: editedVarietal)
            } onTap: {
                editedVarietal = wine.varietal ?? ""
                isEditingVarietal = true
            }

            // Editable Style
            EditableInfoRow(
                label: "Style",
                value: wine.style ?? "Tap to add",
                isEditing: $isEditingStyle,
                editedValue: $editedStyle,
                placeholder: "e.g., Dry, Semi-dry, Sweet"
            ) {
                saveWineField(field: "style", value: editedStyle)
            } onTap: {
                editedStyle = wine.style ?? ""
                isEditingStyle = true
            }

            // Editable Serving Temperature
            EditableInfoRow(
                label: "Serving Temp",
                value: wine.servingTemperature ?? "Tap to add",
                isEditing: $isEditingServingTemp,
                editedValue: $editedServingTemp,
                placeholder: "e.g., 16-18°C"
            ) {
                saveWineField(field: "serving_temperature", value: editedServingTemp)
            } onTap: {
                editedServingTemp = wine.servingTemperature ?? ""
                isEditingServingTemp = true
            }

            // About This Wine section with AI button
            HStack {
                Text("About This Wine")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.vinoText)

                Spacer()

                // AI Enrichment Button
                Button {
                    hapticManager.mediumImpact()
                    Task {
                        await enrichWineWithAI()
                    }
                } label: {
                    HStack(spacing: 6) {
                        if isEnrichingWithAI {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "sparkles")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        Text(isEnrichingWithAI ? "Enriching..." : "AI Fill")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        LinearGradient(
                            colors: [Color.purple, Color.blue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(Capsule())
                }
                .disabled(isEnrichingWithAI)
            }
            .padding(.top, 8)

            // Description (tapping edits in the header section)
            Text(wine.description ?? "Tap the AI Fill button to generate wine details based on the producer and wine name.")
                .font(.system(size: 14))
                .foregroundColor(wine.description == nil ? .vinoTextTertiary : .vinoTextSecondary)
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

            if let pairings = wine.foodPairings, !pairings.isEmpty {
                ForEach(pairings, id: \.self) { pairing in
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
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "fork.knife")
                        .font(.system(size: 32))
                        .foregroundColor(.vinoTextTertiary)
                    Text("No pairings available")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                    Text("Tap the AI Fill button in the Details tab to generate food pairings.")
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
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

    private func fetchExpertRating(vintageId: UUID, forceRefresh: Bool = false) async {
        await MainActor.run {
            isLoadingExpertRating = true
        }

        let rating = await DataService.shared.fetchExpertRating(
            vintageId: vintageId,
            wineName: wine.name,
            producerName: wine.producer,
            year: wine.year
        )

        await MainActor.run {
            expertRating = rating
            isLoadingExpertRating = false
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
            sharedBy: tasting.sharedBy,
            locationName: tasting.locationName,
            locationCity: tasting.locationCity,
            locationAddress: tasting.locationAddress,
            locationLatitude: tasting.locationLatitude,
            locationLongitude: tasting.locationLongitude,
            communityRating: vintage.communityRating,
            communityRatingCount: vintage.communityRatingCount
        )
    }

    // MARK: - Save Functions
    private func saveProducerName() {
        guard !editedProducer.isEmpty else {
            isEditingProducer = false
            return
        }

        Task {
            isSaving = true
            hapticManager.mediumImpact()

            do {
                let client = SupabaseManager.shared.client

                // First, try to find an existing producer with this name
                struct ProducerRow: Decodable {
                    let id: UUID
                    let name: String
                }

                let existingProducers: [ProducerRow] = try await client
                    .from("producers")
                    .select("id, name")
                    .ilike("name", pattern: editedProducer)
                    .limit(1)
                    .execute()
                    .value

                let producerId: UUID

                if let existingProducer = existingProducers.first {
                    // Use existing producer
                    producerId = existingProducer.id
                } else {
                    // Create new producer
                    struct NewProducer: Encodable {
                        let name: String
                    }
                    struct CreatedProducer: Decodable {
                        let id: UUID
                    }

                    let created: [CreatedProducer] = try await client
                        .from("producers")
                        .insert(NewProducer(name: editedProducer))
                        .select("id")
                        .execute()
                        .value

                    guard let newProducer = created.first else {
                        throw NSError(domain: "Producer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create producer"])
                    }
                    producerId = newProducer.id
                }

                // Update the wine to point to this producer
                struct WineProducerUpdate: Encodable {
                    let producer_id: UUID
                }

                try await client
                    .from("wines")
                    .update(WineProducerUpdate(producer_id: producerId))
                    .eq("id", value: wine.id.uuidString)
                    .execute()

                // Update local state
                await MainActor.run {
                    wine.producer = editedProducer
                    isEditingProducer = false
                    isSaving = false
                    hapticManager.success()

                    // Post notification to refresh other views
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } catch {
                print("Error updating producer: \(error)")
                await MainActor.run {
                    isSaving = false
                    hapticManager.error()
                }
            }
        }
    }

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

                // Update local state - this updates the @State wine so UI refreshes
                await MainActor.run {
                    wine.name = editedName
                    isEditingName = false
                    isSaving = false
                    hapticManager.success()

                    // Post notification to refresh wine list
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } catch {
                print("Error updating wine name: \(error)")
                await MainActor.run {
                    isSaving = false
                    hapticManager.error()
                }
            }
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

                // Update local state - this updates the @State wine so UI refreshes
                await MainActor.run {
                    wine.description = editedDescription.isEmpty ? nil : editedDescription
                    isEditingDescription = false
                    isSaving = false
                    hapticManager.success()

                    // Post notification to refresh wine list
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } catch {
                print("Error updating wine description: \(error)")
                await MainActor.run {
                    isSaving = false
                    hapticManager.error()
                }
            }
        }
    }

    private func saveWineField(field: String, value: String) {
        Task {
            isSaving = true
            hapticManager.mediumImpact()

            do {
                let client = SupabaseManager.shared.client

                struct WineFieldUpdate: Encodable {
                    var varietal: String?
                    var style: String?
                    var serving_temperature: String?

                    enum CodingKeys: String, CodingKey {
                        case varietal, style, serving_temperature
                    }

                    func encode(to encoder: Encoder) throws {
                        var container = encoder.container(keyedBy: CodingKeys.self)
                        if let v = varietal { try container.encode(v, forKey: .varietal) }
                        if let s = style { try container.encode(s, forKey: .style) }
                        if let st = serving_temperature { try container.encode(st, forKey: .serving_temperature) }
                    }
                }

                var updateData = WineFieldUpdate()
                let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)

                switch field {
                case "varietal":
                    updateData.varietal = trimmedValue.isEmpty ? nil : trimmedValue
                case "style":
                    updateData.style = trimmedValue.isEmpty ? nil : trimmedValue
                case "serving_temperature":
                    updateData.serving_temperature = trimmedValue.isEmpty ? nil : trimmedValue
                default:
                    break
                }

                try await client
                    .from("wines")
                    .update(updateData)
                    .eq("id", value: wine.id.uuidString)
                    .execute()

                await MainActor.run {
                    // Update local state
                    switch field {
                    case "varietal":
                        wine.varietal = trimmedValue.isEmpty ? nil : trimmedValue
                        isEditingVarietal = false
                    case "style":
                        wine.style = trimmedValue.isEmpty ? nil : trimmedValue
                        isEditingStyle = false
                    case "serving_temperature":
                        wine.servingTemperature = trimmedValue.isEmpty ? nil : trimmedValue
                        isEditingServingTemp = false
                    default:
                        break
                    }
                    isSaving = false
                    hapticManager.success()
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } catch {
                print("Error updating wine field \(field): \(error)")
                await MainActor.run {
                    isSaving = false
                    hapticManager.error()
                }
            }
        }
    }

    private func enrichWineWithAI() async {
        isEnrichingWithAI = true

        do {
            let client = SupabaseManager.shared.client

            // Prepare the request body
            struct EnrichRequest: Encodable {
                let action: String
                let wine_id: String
                let vintage_id: String?
                let producer: String
                let wine_name: String
                let year: Int?
                let region: String?
                let overwrite: Bool
            }

            // Define response type before the call
            struct EnrichmentData: Decodable {
                let wine_type: String?
                let color: String?
                let style: String?
                let food_pairings: [String]?
                let serving_temperature: String?
                let tasting_notes: String?
                let varietals: [String]?
            }

            struct EnrichResponse: Decodable {
                let success: Bool
                let enrichment: EnrichmentData?
            }

            let requestBody = EnrichRequest(
                action: "enrich-single",
                wine_id: wine.id.uuidString,
                vintage_id: wine.vintageId?.uuidString,
                producer: wine.producer,
                wine_name: wine.name,
                year: wine.year,
                region: wine.region,
                overwrite: true
            )

            let enrichResponse: EnrichResponse = try await client.functions.invoke(
                "enrich-wines",
                options: FunctionInvokeOptions(body: requestBody)
            )

            if enrichResponse.success, let enrichment = enrichResponse.enrichment {
                await MainActor.run {
                    // Update local wine state with enriched data
                    if let wineType = enrichment.wine_type {
                        wine.type = WineType(rawValue: wineType) ?? wine.type
                    }
                    if let style = enrichment.style {
                        wine.style = style
                    }
                    if let servingTemp = enrichment.serving_temperature {
                        wine.servingTemperature = servingTemp
                    }
                    if let foodPairings = enrichment.food_pairings {
                        wine.foodPairings = foodPairings
                    }
                    if let tastingNotes = enrichment.tasting_notes {
                        wine.description = tastingNotes
                    }
                    if let varietals = enrichment.varietals, !varietals.isEmpty {
                        wine.varietal = varietals.joined(separator: ", ")
                    }
                    if let color = enrichment.color {
                        wine.color = color
                    }

                    isEnrichingWithAI = false
                    hapticManager.success()
                    NotificationCenter.default.post(name: NSNotification.Name("WineDataChanged"), object: nil)
                }
            } else {
                throw NSError(domain: "Enrichment", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to enrich wine"])
            }
        } catch {
            print("Error enriching wine with AI: \(error)")
            await MainActor.run {
                isEnrichingWithAI = false
                hapticManager.error()
            }
        }
    }
}

// MARK: - Editable Info Row Component
struct EditableInfoRow: View {
    let label: String
    let value: String
    @Binding var isEditing: Bool
    @Binding var editedValue: String
    let placeholder: String
    let onSave: () -> Void
    let onTap: () -> Void

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .frame(width: 100, alignment: .leading)

            if isEditing {
                HStack {
                    TextField(placeholder, text: $editedValue)
                        .font(.system(size: 14))
                        .foregroundColor(.vinoText)
                        .textFieldStyle(.plain)
                        .onSubmit {
                            onSave()
                        }

                    Button {
                        onSave()
                    } label: {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.vinoSuccess)
                    }

                    Button {
                        isEditing = false
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
            } else {
                Text(value)
                    .font(.system(size: 14))
                    .foregroundColor(value == "Tap to add" ? .vinoTextTertiary : .vinoText)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        onTap()
                    }
            }
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