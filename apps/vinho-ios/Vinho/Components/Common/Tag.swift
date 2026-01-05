import SwiftUI

// MARK: - Tag

/// A simple tag/pill component for displaying categories or labels
struct Tag: View {
    let text: String
    var style: TagStyle = .default
    var size: TagSize = .medium

    enum TagStyle {
        case `default`
        case accent
        case gold
        case success
        case warning
        case muted

        var backgroundColor: Color {
            switch self {
            case .default: return Color.vinoAccent.opacity(0.15)
            case .accent: return Color.vinoAccent.opacity(0.2)
            case .gold: return Color.vinoGold.opacity(0.2)
            case .success: return Color.green.opacity(0.2)
            case .warning: return Color.orange.opacity(0.2)
            case .muted: return Color.vinoTextTertiary.opacity(0.2)
            }
        }

        var textColor: Color {
            switch self {
            case .default: return .vinoAccent
            case .accent: return .vinoAccent
            case .gold: return .vinoGold
            case .success: return .green
            case .warning: return .orange
            case .muted: return .vinoTextSecondary
            }
        }
    }

    enum TagSize {
        case small
        case medium
        case large

        var fontSize: CGFloat {
            switch self {
            case .small: return 10
            case .medium: return 12
            case .large: return 14
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .small: return 8
            case .medium: return 12
            case .large: return 16
            }
        }

        var verticalPadding: CGFloat {
            switch self {
            case .small: return 4
            case .medium: return 6
            case .large: return 8
            }
        }
    }

    var body: some View {
        Text(text)
            .font(.system(size: size.fontSize, weight: .medium))
            .foregroundColor(style.textColor)
            .padding(.horizontal, size.horizontalPadding)
            .padding(.vertical, size.verticalPadding)
            .background(
                Capsule()
                    .fill(style.backgroundColor)
            )
    }
}

// MARK: - Selectable Tag

/// A tag that can be selected/deselected
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

// MARK: - Filter Chip

/// A chip used for filtering with optional remove action
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? LinearGradient.vinoGradient : LinearGradient(colors: [Color.vinoDarkSecondary], startPoint: .leading, endPoint: .trailing))
                        .overlay(
                            Capsule()
                                .stroke(isSelected ? Color.clear : Color.vinoBorder, lineWidth: 1)
                        )
                )
                .foregroundColor(isSelected ? .white : .vinoTextSecondary)
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    VStack(spacing: 20) {
        // Tags
        HStack {
            Tag(text: "Red Wine", style: .default)
            Tag(text: "Premium", style: .gold)
            Tag(text: "New", style: .success, size: .small)
        }

        // Selectable Tags
        HStack {
            SelectableTag(text: "Cabernet", isSelected: true, action: {})
            SelectableTag(text: "Merlot", isSelected: false, action: {})
        }

        // Filter Chips
        HStack {
            FilterChip(title: "Red", isSelected: true, action: {})
            FilterChip(title: "White", isSelected: false, action: {})
        }
    }
    .padding()
    .background(Color.vinoDark)
}
#endif
