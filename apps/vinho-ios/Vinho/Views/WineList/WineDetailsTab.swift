import SwiftUI

/// Details tab showing shared catalog information.
struct WineDetailsTab: View {
    @ObservedObject var viewModel: WineDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            InfoRow(label: "Varietal", value: viewModel.wine.varietal)
            InfoRow(label: "Style", value: viewModel.wine.style)
            InfoRow(label: "Serving Temp", value: viewModel.wine.servingTemperature)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.vinoDark)
        )
    }

    private struct InfoRow: View {
        let label: String
        let value: String?

        var body: some View {
            HStack {
                Text(label)
                    .foregroundColor(.vinoTextSecondary)
                    .frame(width: 100, alignment: .leading)
                Text(value ?? "Not available")
                    .foregroundColor(value == nil ? .vinoTextTertiary : .vinoText)
                Spacer()
            }
            .font(.system(size: 14))
        }
    }
}
