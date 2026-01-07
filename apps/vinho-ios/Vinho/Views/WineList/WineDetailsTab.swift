import SwiftUI

/// Details tab showing wine information with editable fields and AI enrichment
struct WineDetailsTab: View {
    @ObservedObject var viewModel: WineDetailViewModel
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Editable Varietal
            EditableInfoRow(
                label: "Varietal",
                value: viewModel.wine.varietal ?? "Tap to add",
                isEditing: $viewModel.isEditingVarietal,
                editedValue: $viewModel.editedVarietal,
                placeholder: "e.g., Pinot Noir, Chardonnay"
            ) {
                viewModel.saveWineField(field: "varietal", value: viewModel.editedVarietal, hapticManager: hapticManager)
            } onTap: {
                viewModel.startEditingVarietal()
            }

            // Editable Style
            EditableInfoRow(
                label: "Style",
                value: viewModel.wine.style ?? "Tap to add",
                isEditing: $viewModel.isEditingStyle,
                editedValue: $viewModel.editedStyle,
                placeholder: "e.g., Dry, Semi-dry, Sweet"
            ) {
                viewModel.saveWineField(field: "style", value: viewModel.editedStyle, hapticManager: hapticManager)
            } onTap: {
                viewModel.startEditingStyle()
            }

            // Editable Serving Temperature
            EditableInfoRow(
                label: "Serving Temp",
                value: viewModel.wine.servingTemperature ?? "Tap to add",
                isEditing: $viewModel.isEditingServingTemp,
                editedValue: $viewModel.editedServingTemp,
                placeholder: "e.g., 16-18C"
            ) {
                viewModel.saveWineField(field: "serving_temperature", value: viewModel.editedServingTemp, hapticManager: hapticManager)
            } onTap: {
                viewModel.startEditingServingTemp()
            }

            // About This Wine section with AI button
            aboutWineSection
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }

    // MARK: - About Wine Section

    private var aboutWineSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("About This Wine")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.vinoText)

                Spacer()

                aiEnrichmentButton
            }
            .padding(.top, 8)

            // Description
            Text(viewModel.wine.description ?? "Tap the AI Fill button to generate wine details based on the producer and wine name.")
                .font(.system(size: 14))
                .foregroundColor(viewModel.wine.description == nil ? .vinoTextTertiary : .vinoTextSecondary)
                .lineSpacing(4)
        }
    }

    // MARK: - AI Enrichment Button

    private var aiEnrichmentButton: some View {
        Button {
            hapticManager.mediumImpact()
            Task {
                await viewModel.enrichWineWithAI(hapticManager: hapticManager)
            }
        } label: {
            HStack(spacing: 6) {
                if viewModel.isEnrichingWithAI {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "sparkles")
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(viewModel.isEnrichingWithAI ? "Enriching..." : "AI Fill")
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
        .disabled(viewModel.isEnrichingWithAI)
    }
}
