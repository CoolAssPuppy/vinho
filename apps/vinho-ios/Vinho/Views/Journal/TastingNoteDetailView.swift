import SwiftUI

/// Detailed view for a single tasting note with inline editing
struct TastingNoteDetailView: View {
    let note: TastingNoteWithWine
    var fromWine: Bool = false // Track if navigated from wine to prevent circular nav
    let onEdit: () -> Void
    let onDelete: () -> Void
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var showingShareSheet = false
    @State private var showingDeleteAlert = false
    @State private var showingWineDetail = false
    @State private var wineForDetail: WineWithDetails?
    @State private var isLoadingWine = false

    // Editable fields
    @State private var editedRating: Int
    @State private var editedNotes: String
    @State private var editedDate: Date
    @State private var editedLocationName: String
    @State private var isEditingRating = false
    @State private var isEditingNotes = false
    @State private var isEditingDate = false
    @State private var isEditingLocation = false
    @State private var isSaving = false
    @State private var showingImageViewer = false
    @State private var showingDatePicker = false
    @State private var showingLocationPicker = false

    init(note: TastingNoteWithWine, fromWine: Bool = false, onEdit: @escaping () -> Void, onDelete: @escaping () -> Void) {
        self.note = note
        self.fromWine = fromWine
        self.onEdit = onEdit
        self.onDelete = onDelete
        self._editedRating = State(initialValue: note.rating)
        self._editedNotes = State(initialValue: note.notes ?? "")
        self._editedDate = State(initialValue: note.date)
        self._editedLocationName = State(initialValue: note.locationName ?? "")
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Wine Header
                        wineHeader
                        
                        // Rating Section
                        ratingSection
                        
                        // Tasting Date
                        dateSection
                        
                        // Tasting Notes
                        if let notes = note.notes {
                            notesSection(notes: notes)
                        }
                        
                        // Aromas & Flavors
                        aromasAndFlavors
                        
                        // Wine Details
                        wineDetails

                        // Action Buttons at bottom
                        actionButtons

                        Spacer(minLength: 50)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Tasting Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        hapticManager.lightImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.medium)
                }
            }
            .alert("Delete Tasting Note?", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    dismiss()
                    onDelete()
                }
            } message: {
                Text("This action cannot be undone.")
            }
        }
        .sheet(isPresented: $showingWineDetail) {
            if let wine = wineForDetail {
                WineDetailView(wine: wine, fromTasting: true)
                    .environmentObject(hapticManager)
            }
        }
        .fullScreenCover(isPresented: $showingImageViewer) {
            if let imageUrl = note.imageUrl {
                FullScreenImageViewer(imageUrl: imageUrl)
                    .environmentObject(hapticManager)
            }
        }
        .sheet(isPresented: $showingDatePicker) {
            DatePickerSheet(selectedDate: $editedDate) { newDate in
                Task {
                    await saveTastingDate(newDate)
                }
            }
            .environmentObject(hapticManager)
        }
        .sheet(isPresented: $showingLocationPicker) {
            LocationPickerSheet(selectedLocation: $editedLocationName) { location in
                Task {
                    await saveTastingLocation(location)
                }
            }
            .environmentObject(hapticManager)
        }
    }

    var wineHeader: some View {
        VStack(spacing: 16) {
            // Wine Image
            if let imageUrl = note.imageUrl {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    Rectangle()
                        .fill(Color.vinoDarkSecondary)
                        .shimmer()
                }
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .onTapGesture {
                    hapticManager.lightImpact()
                    showingImageViewer = true
                }
            } else {
                ZStack {
                    LinearGradient(
                        colors: [Color.vinoPrimary.opacity(0.3), Color.vinoDarkSecondary],
                        startPoint: .top,
                        endPoint: .bottom
                    )

                    Image(systemName: "wineglass")
                        .font(.system(size: 60))
                        .foregroundColor(.vinoPrimary.opacity(0.5))
                }
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 20))
            }

            // Wine Info - tappable if not from wine view
            if !fromWine {
                Button {
                    hapticManager.mediumImpact()
                    Task {
                        await loadWineDetails()
                    }
                } label: {
                    VStack(spacing: 8) {
                        Text(note.producer)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.vinoAccent)
                            .textCase(.uppercase)
                            .tracking(1.2)

                        HStack(spacing: 8) {
                            Text(note.wineName)
                                .font(.system(size: 28, weight: .bold, design: .serif))
                                .foregroundColor(.vinoText)

                            Image(systemName: "arrow.up.forward.circle.fill")
                                .font(.system(size: 22))
                                .foregroundColor(.vinoAccent)
                        }

                        if let vintage = note.vintage {
                            Text(String(vintage))
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.vinoTextSecondary)
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.vinoDarkSecondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .strokeBorder(
                                        LinearGradient(
                                            colors: [Color.vinoAccent.opacity(0.5), Color.vinoAccent.opacity(0.2)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        lineWidth: 2
                                    )
                            )
                    )
                }
                .buttonStyle(ScaleButtonStyle())
            } else {
                // Not tappable - show without button styling
                VStack(spacing: 8) {
                    Text(note.producer)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.vinoAccent)
                        .textCase(.uppercase)
                        .tracking(1.2)

                    Text(note.wineName)
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundColor(.vinoText)

                    if let vintage = note.vintage {
                        Text(String(vintage))
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.vinoTextSecondary)
                    }
                }
            }
        }
    }
    
    var ratingSection: some View {
        VStack(spacing: 12) {
            Text("Your Rating")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .textCase(.uppercase)

            HStack(spacing: 8) {
                ForEach(0..<5) { index in
                    Image(systemName: index < editedRating ? "star.fill" : "star")
                        .font(.system(size: 28))
                        .foregroundColor(index < editedRating ? .vinoGold : .vinoTextTertiary)
                        .onTapGesture {
                            hapticManager.lightImpact()
                            editedRating = index + 1
                            saveChanges()
                        }
                }
            }

            Text(ratingDescription)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoText)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDarkSecondary)
        )
    }
    
    var dateSection: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "calendar")
                    .font(.system(size: 16))
                    .foregroundColor(.vinoAccent)

                Text("Tasted on")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)

                Spacer()

                Text(formattedDate)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.vinoAccent)
            }
            .contentShape(Rectangle())
            .onTapGesture {
                hapticManager.lightImpact()
                showingDatePicker = true
            }

            // Location section
            HStack {
                Image(systemName: "mappin.circle")
                    .font(.system(size: 16))
                    .foregroundColor(.vinoAccent)

                Text("Tasting location")
                    .font(.system(size: 14))
                    .foregroundColor(.vinoTextSecondary)

                Spacer()

                Text(editedLocationName.isEmpty ? "Tap to add" : editedLocationName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(editedLocationName.isEmpty ? .vinoTextTertiary : .vinoAccent)
            }
            .contentShape(Rectangle())
            .onTapGesture {
                hapticManager.lightImpact()
                showingLocationPicker = true
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDarkSecondary)
        )
    }
    
    func notesSection(notes: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tasting Notes")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)

            if isEditingNotes {
                TextEditor(text: $editedNotes)
                    .font(.system(size: 15))
                    .foregroundColor(.vinoText)
                    .scrollContentBackground(.hidden)
                    .padding(8)
                    .frame(minHeight: 100)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.vinoDark)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.vinoBorder, lineWidth: 1)
                            )
                    )

                HStack {
                    Button("Cancel") {
                        hapticManager.lightImpact()
                        editedNotes = note.notes ?? ""
                        isEditingNotes = false
                    }
                    .foregroundColor(.vinoTextSecondary)

                    Spacer()

                    Button("Save") {
                        hapticManager.success()
                        isEditingNotes = false
                        saveChanges()
                    }
                    .foregroundColor(.vinoSuccess)
                    .fontWeight(.semibold)
                    .disabled(isSaving)
                }
                .font(.system(size: 14))
            } else {
                Text(editedNotes.isEmpty ? "Tap to add tasting notes" : editedNotes)
                    .font(.system(size: 15))
                    .foregroundColor(editedNotes.isEmpty ? .vinoTextTertiary : .vinoTextSecondary)
                    .lineSpacing(6)
                    .fixedSize(horizontal: false, vertical: true)
                    .onTapGesture {
                        hapticManager.lightImpact()
                        isEditingNotes = true
                    }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDarkSecondary)
        )
    }
    
    var aromasAndFlavors: some View {
        VStack(spacing: 16) {
            // Aromas
            if !note.aromas.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "nose")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoAccent)
                        Text("Aromas")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.vinoText)
                    }
                    
                    FlowLayout(spacing: 8) {
                        ForEach(note.aromas, id: \.self) { aroma in
                            DetailTag(text: aroma, color: .vinoPrimary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDarkSecondary)
                )
            }
            
            // Flavors
            if !note.flavors.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "mouth")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoAccent)
                        Text("Flavors")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.vinoText)
                    }
                    
                    FlowLayout(spacing: 8) {
                        ForEach(note.flavors, id: \.self) { flavor in
                            DetailTag(text: flavor, color: .vinoAccent)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDarkSecondary)
                )
            }
        }
    }
    
    var wineDetails: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Wine Information")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            VStack(spacing: 12) {
                InfoRow(label: "Producer", value: note.producer)
                InfoRow(label: "Wine", value: note.wineName)
                if let vintage = note.vintage {
                    InfoRow(label: "Vintage", value: String(vintage))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.vinoDarkSecondary)
        )
    }
    
    var ratingDescription: String {
        switch editedRating {
        case 1: return "Disappointing"
        case 2: return "Below Average"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Outstanding"
        default: return ""
        }
    }

    var actionButtons: some View {
        VStack(spacing: 12) {
            // Share Button
            Button {
                hapticManager.mediumImpact()
                showingShareSheet = true
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share Tasting")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoDarkSecondary)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.vinoAccent, lineWidth: 1)
                        )
                )
                .foregroundColor(.vinoAccent)
            }

            // Delete Button
            Button {
                hapticManager.mediumImpact()
                showingDeleteAlert = true
            } label: {
                HStack {
                    Image(systemName: "trash")
                    Text("Delete Tasting")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.vinoError.opacity(0.1))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.vinoError.opacity(0.3), lineWidth: 1)
                        )
                )
                .foregroundColor(.vinoError)
            }
        }
    }

    // MARK: - Save Changes
    private func saveChanges() {
        guard !isSaving else { return }
        isSaving = true

        Task {
            do {
                try await DataService.shared.updateTastingRatingAndNotes(
                    id: note.id,
                    rating: editedRating,
                    notes: editedNotes.isEmpty ? nil : editedNotes
                )

                await MainActor.run {
                    isSaving = false
                    hapticManager.success()
                }
            } catch {
                print("Error saving tasting changes: \(error)")
                await MainActor.run {
                    isSaving = false
                    hapticManager.error()
                }
            }
        }
    }

    private func saveTastingDate(_ newDate: Date) async {
        guard !isSaving else { return }
        isSaving = true

        do {
            let client = SupabaseManager.shared.client
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let dateString = dateFormatter.string(from: newDate)

            try await client
                .from("tastings")
                .update(["tasted_at": dateString])
                .eq("id", value: note.id.uuidString)
                .execute()

            await MainActor.run {
                isSaving = false
                isEditingDate = false
                hapticManager.success()
            }
        } catch {
            print("Error saving tasting date: \(error)")
            await MainActor.run {
                isSaving = false
                hapticManager.error()
            }
        }
    }

    private func saveTastingLocation(_ location: TastingLocation) async {
        guard !isSaving else { return }
        isSaving = true

        do {
            let client = SupabaseManager.shared.client

            struct LocationUpdate: Encodable {
                let location_name: String?
                let location_address: String?
                let location_city: String?
                let location_latitude: Double?
                let location_longitude: Double?
            }

            let updateData = LocationUpdate(
                location_name: location.name.isEmpty ? nil : location.name,
                location_address: location.address.isEmpty ? nil : location.address,
                location_city: location.city,
                location_latitude: location.latitude,
                location_longitude: location.longitude
            )

            try await client
                .from("tastings")
                .update(updateData)
                .eq("id", value: note.id.uuidString)
                .execute()

            await MainActor.run {
                isSaving = false
                isEditingLocation = false
                hapticManager.success()
            }
        } catch {
            print("Error saving tasting location: \(error)")
            await MainActor.run {
                isSaving = false
                hapticManager.error()
            }
        }
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .none
        return formatter.string(from: editedDate)
    }

    // MARK: - Wine Loading
    private func loadWineDetails() async {
        isLoadingWine = true
        hapticManager.lightImpact()

        // Fetch the vintage to get the wine ID
        do {
            struct VintageResponse: Decodable {
                let wine_id: UUID
                let year: Int?
                let wine: WineResponse
            }

            struct WineResponse: Decodable {
                let id: UUID
                let name: String
                let producer_id: UUID?
                let tasting_notes: String?
                let wine_type: String?
                let producer: ProducerResponse?
            }

            struct ProducerResponse: Decodable {
                let name: String
            }

            let client = SupabaseManager.shared.client
            let vintage: VintageResponse = try await client
                .from("vintages")
                .select("wine_id, year, wine:wine_id(id, name, producer_id, tasting_notes, wine_type, producer:producer_id(name))")
                .eq("id", value: note.vintageId.uuidString)
                .single()
                .execute()
                .value

            // Convert to WineWithDetails
            let wineType: WineType
            if let typeString = vintage.wine.wine_type {
                wineType = WineType(rawValue: typeString.capitalized) ?? .red
            } else {
                wineType = .red
            }

            let wine = WineWithDetails(
                id: vintage.wine.id,
                name: vintage.wine.name,
                producer: vintage.wine.producer?.name ?? note.producer,
                year: vintage.year,
                region: nil,
                varietal: nil,
                price: nil,
                averageRating: Double(note.rating),
                imageUrl: note.imageUrl,
                type: wineType,
                description: vintage.wine.tasting_notes
            )

            await MainActor.run {
                wineForDetail = wine
                showingWineDetail = true
                isLoadingWine = false
            }
        } catch {
            print("Failed to load wine details: \(error)")
            await MainActor.run {
                isLoadingWine = false
            }
        }
    }
}

// MARK: - New Tasting Note View
struct NewTastingNoteView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var selectedWine: WineWithDetails?
    @State private var rating = 3
    @State private var notes = ""
    @State private var selectedAromas: Set<String> = []
    @State private var selectedFlavors: Set<String> = []
    @State private var showingWineSelector = false
    
    let commonAromas = ["blackcurrant", "cherry", "plum", "violet", "rose", "cedar",
                       "tobacco", "leather", "vanilla", "oak", "smoke", "earth"]
    let commonFlavors = ["fruit", "spice", "chocolate", "coffee", "mineral", "herbs",
                        "butter", "honey", "citrus", "apple", "pear", "tropical"]
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Wine Selection
                        wineSelector
                        
                        // Rating
                        ratingSelector
                        
                        // Notes
                        notesEditor
                        
                        // Aromas
                        aromaSelector
                        
                        // Flavors
                        flavorSelector
                        
                        Spacer(minLength: 100)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("New Tasting Note")
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
                        saveTastingNote()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                    .disabled(selectedWine == nil)
                }
            }
        }
        .sheet(isPresented: $showingWineSelector) {
            WineSelectorView(selectedWine: $selectedWine)
                .environmentObject(hapticManager)
        }
    }
    
    var wineSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Select Wine")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            Button {
                hapticManager.lightImpact()
                showingWineSelector = true
            } label: {
                HStack {
                    if let wine = selectedWine {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(wine.producer)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.vinoAccent)
                            Text(wine.name)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.vinoText)
                        }
                    } else {
                        Text("Tap to select wine")
                            .font(.system(size: 16))
                            .foregroundColor(.vinoTextSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(.vinoTextTertiary)
                }
                .padding(16)
                .frame(maxWidth: .infinity)
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
    }
    
    var ratingSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Rating")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            HStack(spacing: 16) {
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
            .frame(maxWidth: .infinity)
        }
    }
    
    var notesEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tasting Notes")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            TextEditor(text: $notes)
                .font(.system(size: 16))
                .foregroundColor(.vinoText)
                .scrollContentBackground(.hidden)
                .padding(12)
                .frame(minHeight: 120)
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
    
    var aromaSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Aromas")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            FlowLayout(spacing: 8) {
                ForEach(commonAromas, id: \.self) { aroma in
                    SelectableTag(
                        text: aroma,
                        isSelected: selectedAromas.contains(aroma)
                    ) {
                        hapticManager.selection()
                        if selectedAromas.contains(aroma) {
                            selectedAromas.remove(aroma)
                        } else {
                            selectedAromas.insert(aroma)
                        }
                    }
                }
            }
        }
    }
    
    var flavorSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Flavors")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.vinoText)
            
            FlowLayout(spacing: 8) {
                ForEach(commonFlavors, id: \.self) { flavor in
                    SelectableTag(
                        text: flavor,
                        isSelected: selectedFlavors.contains(flavor)
                    ) {
                        hapticManager.selection()
                        if selectedFlavors.contains(flavor) {
                            selectedFlavors.remove(flavor)
                        } else {
                            selectedFlavors.insert(flavor)
                        }
                    }
                }
            }
        }
    }
    
    func saveTastingNote() {
        // Save to database
    }
}

// MARK: - Supporting Views
struct DetailTag: View {
    let text: String
    let color: Color
    
    var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(color)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(color.opacity(0.15))
            )
    }
}

struct SelectableTag: View {
    let text: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(isSelected ? .white : .vinoTextSecondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(isSelected ? AnyShapeStyle(LinearGradient.vinoGradient) : AnyShapeStyle(Color.vinoDarkSecondary))
                        .overlay(
                            Capsule()
                                .stroke(isSelected ? Color.clear : Color.vinoBorder, lineWidth: 1)
                        )
                )
        }
    }
}

struct FlowLayout: Layout {
    let spacing: CGFloat
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.replacingUnspecifiedDimensions().width, subviews: subviews, spacing: spacing)
        return CGSize(width: proposal.replacingUnspecifiedDimensions().width, height: result.height)
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for row in result.rows {
            for item in row {
                let pt = CGPoint(x: bounds.minX + item.x, y: bounds.minY + item.y)
                item.view.place(at: pt, proposal: ProposedViewSize(item.size))
            }
        }
    }
    
    struct FlowResult {
        var rows: [[Item]] = []
        var height: CGFloat = 0
        
        struct Item {
            var view: LayoutSubviews.Element
            var size: CGSize
            var x: CGFloat
            var y: CGFloat
        }
        
        init(in width: CGFloat, subviews: LayoutSubviews, spacing: CGFloat) {
            var currentRow: [Item] = []
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if currentX + size.width > width && !currentRow.isEmpty {
                    rows.append(currentRow)
                    currentRow = []
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }
                
                currentRow.append(Item(view: subview, size: size, x: currentX, y: currentY))
                currentX += size.width + spacing
                lineHeight = max(lineHeight, size.height)
            }
            
            if !currentRow.isEmpty {
                rows.append(currentRow)
                height = currentY + lineHeight
            }
        }
    }
}

// MARK: - Button Styles
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Wine Selector View
struct WineSelectorView: View {
    @Binding var selectedWine: WineWithDetails?
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    
    let wines: [WineWithDetails] = []
    
    var filteredWines: [WineWithDetails] {
        if searchText.isEmpty {
            return wines
        }
        let search = searchText.lowercased()
        return wines.filter {
            $0.name.lowercased().contains(search) ||
            $0.producer.lowercased().contains(search)
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                VStack {
                    // Search Bar
                    HStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.vinoTextSecondary)
                        
                        TextField("Search wines...", text: $searchText)
                            .font(.system(size: 16))
                            .foregroundColor(.vinoText)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.vinoDarkSecondary)
                    )
                    .padding()
                    
                    // Wine List
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredWines) { wine in
                                Button {
                                    hapticManager.lightImpact()
                                    selectedWine = wine
                                    dismiss()
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(wine.producer)
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.vinoAccent)
                                            Text(wine.name)
                                                .font(.system(size: 16, weight: .medium))
                                                .foregroundColor(.vinoText)
                                            if let year = wine.year {
                                                Text(String(year))
                                                    .font(.system(size: 14))
                                                    .foregroundColor(.vinoTextSecondary)
                                            }
                                        }
                                        
                                        Spacer()
                                        
                                        if selectedWine?.id == wine.id {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.vinoSuccess)
                                        }
                                    }
                                    .padding(16)
                                    .background(
                                        RoundedRectangle(cornerRadius: 16)
                                            .fill(Color.vinoDarkSecondary)
                                    )
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Select Wine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        hapticManager.lightImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                }
            }
        }
    }
}
// MARK: - Full Screen Image Viewer
struct FullScreenImageViewer: View {
    let imageUrl: String
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var hapticManager: HapticManager
    @State private var dragOffset: CGFloat = 0

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            AsyncImage(url: URL(string: imageUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .offset(y: dragOffset)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                if value.translation.height > 0 {
                                    dragOffset = value.translation.height
                                }
                            }
                            .onEnded { value in
                                if value.translation.height > 100 {
                                    hapticManager.lightImpact()
                                    dismiss()
                                } else {
                                    withAnimation(.spring()) {
                                        dragOffset = 0
                                    }
                                }
                            }
                    )
            } placeholder: {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            }

            VStack {
                HStack {
                    Spacer()
                    Button {
                        hapticManager.lightImpact()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.8))
                            .shadow(color: .black.opacity(0.3), radius: 5)
                    }
                    .padding()
                }
                Spacer()
            }
        }
    }
}

// MARK: - Date Picker Sheet
struct DatePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var hapticManager: HapticManager
    @Binding var selectedDate: Date
    let onSave: (Date) -> Void

    @State private var tempDate: Date

    init(selectedDate: Binding<Date>, onSave: @escaping (Date) -> Void) {
        self._selectedDate = selectedDate
        self.onSave = onSave
        self._tempDate = State(initialValue: selectedDate.wrappedValue)
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                DatePicker(
                    "Select Date",
                    selection: $tempDate,
                    displayedComponents: [.date]
                )
                .datePickerStyle(.graphical)
                .padding()

                Spacer()
            }
            .background(Color.vinoDark)
            .navigationTitle("Tasting Date")
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
                    Button("Done") {
                        hapticManager.lightImpact()
                        selectedDate = tempDate
                        onSave(tempDate)
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Location Picker Sheet
struct LocationPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var hapticManager: HapticManager
    @Binding var selectedLocation: String
    let onSave: (TastingLocation) -> Void

    @State private var searchText: String
    @State private var selectedPlace: TastingLocation?

    init(selectedLocation: Binding<String>, onSave: @escaping (TastingLocation) -> Void) {
        self._selectedLocation = selectedLocation
        self.onSave = onSave
        self._searchText = State(initialValue: selectedLocation.wrappedValue)
    }

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 20) {
                PlaceAutocompleteField(
                    text: $searchText,
                    selectedPlace: $selectedPlace,
                    placeholder: "Search for a location"
                )
                .padding(.horizontal)
                .padding(.top, 8)

                if let place = selectedPlace {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Selected Location")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.vinoTextSecondary)
                            .padding(.horizontal)

                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(.vinoAccent)
                                    .font(.system(size: 16))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(place.name)
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundColor(.vinoText)

                                    if !place.address.isEmpty {
                                        Text(place.address)
                                            .font(.system(size: 13))
                                            .foregroundColor(.vinoTextSecondary)
                                            .lineLimit(2)
                                    }
                                }

                                Spacer()
                            }
                            .padding()
                            .background(Color.vinoCardBg)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }
                    .padding(.top, 8)
                }

                Spacer()
            }
            .background(Color.vinoDark)
            .navigationTitle("Tasting Location")
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
                    Button("Done") {
                        hapticManager.lightImpact()
                        if let place = selectedPlace {
                            selectedLocation = place.name
                            onSave(place)
                        }
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                    .fontWeight(.semibold)
                    .disabled(selectedPlace == nil)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
