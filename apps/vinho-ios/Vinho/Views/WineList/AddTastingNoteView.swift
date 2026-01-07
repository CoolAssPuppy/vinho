import SwiftUI

/// View for adding a new tasting note to a wine
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
                        wineInfoSection
                        ratingSection
                        tastingNotesSection
                    }
                    .padding()
                }
            }
            .navigationTitle("Add Tasting Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    cancelButton
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    saveButton
                }
            }
        }
    }

    // MARK: - Wine Info Section

    private var wineInfoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(wine.producer)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.vinoAccent)
                .textCase(.uppercase)

            Text(wine.name)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.vinoText)

            if let year = wine.year {
                Text("\(year) - \(wine.region ?? "")")
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
    }

    // MARK: - Rating Section

    private var ratingSection: some View {
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
    }

    // MARK: - Tasting Notes Section

    private var tastingNotesSection: some View {
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

    // MARK: - Toolbar Buttons

    private var cancelButton: some View {
        Button("Cancel") {
            hapticManager.lightImpact()
            dismiss()
        }
        .foregroundColor(.vinoAccent)
    }

    private var saveButton: some View {
        Button("Save") {
            hapticManager.success()
            // Save tasting note
            dismiss()
        }
        .foregroundColor(.vinoAccent)
        .fontWeight(.semibold)
    }
}
