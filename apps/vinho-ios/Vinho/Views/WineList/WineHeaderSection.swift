import SwiftUI

/// Wine header section with editable producer, name, description, and metadata
struct WineHeaderSection: View {
    @ObservedObject var viewModel: WineDetailViewModel
    @EnvironmentObject var hapticManager: HapticManager

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Producer (Editable)
            producerRow

            // Wine Name (Editable)
            wineNameRow

            // Wine Description (Editable)
            wineDescriptionRow

            // Vintage and Region
            vintageAndRegionRow
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Producer Row

    @ViewBuilder
    private var producerRow: some View {
        if viewModel.isEditingProducer {
            HStack {
                TextField("Producer Name", text: $viewModel.editedProducer)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.vinoAccent)
                    .textCase(.uppercase)
                    .tracking(1.2)
                    .textFieldStyle(.plain)
                    .onSubmit {
                        viewModel.saveProducerName(hapticManager: hapticManager)
                    }

                Button {
                    viewModel.saveProducerName(hapticManager: hapticManager)
                } label: {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.vinoSuccess)
                }

                Button {
                    hapticManager.lightImpact()
                    viewModel.cancelEditingProducer()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.vinoTextSecondary)
                }
            }
        } else {
            Text(viewModel.wine.producer)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.vinoAccent)
                .textCase(.uppercase)
                .tracking(1.2)
                .onTapGesture {
                    hapticManager.lightImpact()
                    viewModel.startEditingProducer()
                }
        }
    }

    // MARK: - Wine Name Row

    @ViewBuilder
    private var wineNameRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            if viewModel.isEditingName {
                TextField("Wine Name", text: $viewModel.editedName)
                    .font(.system(size: 32, weight: .bold, design: .serif))
                    .foregroundColor(.vinoText)
                    .textFieldStyle(.plain)
                    .onSubmit {
                        viewModel.saveWineName(hapticManager: hapticManager)
                    }
                    .overlay(alignment: .trailing) {
                        Button {
                            viewModel.saveWineName(hapticManager: hapticManager)
                        } label: {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.vinoSuccess)
                        }
                        .padding(.leading, 8)
                    }
            } else {
                Text(viewModel.wine.name)
                    .font(.system(size: 32, weight: .bold, design: .serif))
                    .foregroundColor(.vinoText)
                    .onTapGesture {
                        hapticManager.lightImpact()
                        viewModel.startEditingName()
                    }
            }
        }
    }

    // MARK: - Wine Description Row

    @ViewBuilder
    private var wineDescriptionRow: some View {
        if viewModel.isEditingDescription || viewModel.wine.description != nil {
            VStack(alignment: .leading, spacing: 8) {
                if viewModel.isEditingDescription {
                    TextEditor(text: $viewModel.editedDescription)
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
                            viewModel.cancelEditingDescription()
                        }
                        .foregroundColor(.vinoTextSecondary)

                        Spacer()

                        Button("Save") {
                            viewModel.saveWineDescription(hapticManager: hapticManager)
                        }
                        .foregroundColor(.vinoSuccess)
                        .fontWeight(.semibold)
                        .disabled(viewModel.isSaving)
                    }
                    .font(.system(size: 14))
                } else {
                    Text(viewModel.wine.description ?? "Tap to add wine description")
                        .font(.system(size: 14))
                        .foregroundColor(viewModel.wine.description == nil ? .vinoTextTertiary : .vinoTextSecondary)
                        .lineSpacing(4)
                        .onTapGesture {
                            hapticManager.lightImpact()
                            viewModel.startEditingDescription()
                        }
                }
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Vintage and Region Row

    private var vintageAndRegionRow: some View {
        HStack(spacing: 16) {
            if let year = viewModel.wine.year {
                Label {
                    Text(String(year))
                        .font(.system(size: 16, weight: .medium))
                } icon: {
                    Image(systemName: "calendar")
                        .font(.system(size: 14))
                }
                .foregroundColor(.vinoTextSecondary)
            }

            if let region = viewModel.wine.region {
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
}
