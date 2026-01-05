import SwiftUI

// MARK: - Flow Layout

/// A layout that arranges views horizontally and wraps to new lines
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

// MARK: - Preview

#if DEBUG
#Preview {
    FlowLayout(spacing: 8) {
        ForEach(["Red", "White", "Rose", "Sparkling", "Dessert", "Fortified", "Orange"], id: \.self) { type in
            Text(type)
                .font(.system(size: 12))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.vinoAccent.opacity(0.2))
                .foregroundColor(.vinoAccent)
                .cornerRadius(16)
        }
    }
    .padding()
    .background(Color.vinoDark)
}
#endif
