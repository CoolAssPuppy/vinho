import SwiftUI

/// Detailed view for a single tasting note
struct TastingNoteDetailView: View {
    let note: TastingNoteWithWine
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var showingEditView = false
    @State private var showingShareSheet = false
    
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
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            hapticManager.lightImpact()
                            showingEditView = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        
                        Button {
                            hapticManager.lightImpact()
                            showingShareSheet = true
                        } label: {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                        
                        Button(role: .destructive) {
                            hapticManager.lightImpact()
                            // Delete note
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundColor(.vinoAccent)
                    }
                }
            }
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
            
            // Wine Info
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
    
    var ratingSection: some View {
        VStack(spacing: 12) {
            Text("Your Rating")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .textCase(.uppercase)
            
            HStack(spacing: 8) {
                ForEach(0..<5) { index in
                    Image(systemName: index < note.rating ? "star.fill" : "star")
                        .font(.system(size: 28))
                        .foregroundColor(index < note.rating ? .vinoGold : .vinoTextTertiary)
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
                .foregroundColor(.vinoText)
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
            
            Text(notes)
                .font(.system(size: 15))
                .foregroundColor(.vinoTextSecondary)
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
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
        switch note.rating {
        case 1: return "Disappointing"
        case 2: return "Below Average"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Outstanding"
        default: return ""
        }
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        return formatter.string(from: note.date)
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
                        .fill(isSelected ? LinearGradient.vinoGradient : Color.vinoDarkSecondary)
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

// MARK: - Wine Selector View
struct WineSelectorView: View {
    @Binding var selectedWine: WineWithDetails?
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    
    let wines = WineWithDetails.sampleData
    
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