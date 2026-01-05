import SwiftUI

// MARK: - Typography System

/// Centralized typography system for consistent text styling across the app
enum VinoTypography {

    // MARK: - Display Styles (Large headers, hero text)

    static let displayLarge = Font.system(size: 34, weight: .bold, design: .rounded)
    static let displayMedium = Font.system(size: 28, weight: .bold, design: .rounded)
    static let displaySmall = Font.system(size: 24, weight: .bold, design: .rounded)

    // MARK: - Title Styles (Section headers, card titles)

    static let titleLarge = Font.system(size: 22, weight: .bold)
    static let titleMedium = Font.system(size: 18, weight: .semibold)
    static let titleSmall = Font.system(size: 16, weight: .semibold)

    // MARK: - Body Styles (Main content text)

    static let bodyLarge = Font.system(size: 16, weight: .regular)
    static let bodyMedium = Font.system(size: 14, weight: .regular)
    static let bodySmall = Font.system(size: 13, weight: .regular)

    // MARK: - Label Styles (Form labels, metadata)

    static let labelLarge = Font.system(size: 14, weight: .medium)
    static let labelMedium = Font.system(size: 12, weight: .medium)
    static let labelSmall = Font.system(size: 10, weight: .medium)

    // MARK: - Caption Styles (Secondary info, timestamps)

    static let captionLarge = Font.system(size: 12, weight: .regular)
    static let captionMedium = Font.system(size: 10, weight: .regular)
    static let captionSmall = Font.system(size: 9, weight: .regular)

    // MARK: - Special Styles

    static let rating = Font.system(size: 28, weight: .bold, design: .rounded)
    static let ratingSmall = Font.system(size: 18, weight: .bold, design: .rounded)
    static let statValue = Font.system(size: 24, weight: .bold, design: .rounded)
    static let buttonText = Font.system(size: 16, weight: .semibold)
    static let tabLabel = Font.system(size: 14, weight: .medium)
    static let badge = Font.system(size: 12, weight: .bold)
    static let uppercase = Font.system(size: 12, weight: .medium)
}

// MARK: - Text Style View Modifiers

extension View {
    /// Apply display large text style
    func displayLargeStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.displayLarge)
            .foregroundColor(color)
    }

    /// Apply display medium text style
    func displayMediumStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.displayMedium)
            .foregroundColor(color)
    }

    /// Apply title large text style
    func titleLargeStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.titleLarge)
            .foregroundColor(color)
    }

    /// Apply title medium text style
    func titleMediumStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.titleMedium)
            .foregroundColor(color)
    }

    /// Apply title small text style
    func titleSmallStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.titleSmall)
            .foregroundColor(color)
    }

    /// Apply body large text style
    func bodyLargeStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.bodyLarge)
            .foregroundColor(color)
    }

    /// Apply body medium text style
    func bodyMediumStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.bodyMedium)
            .foregroundColor(color)
    }

    /// Apply body small text style
    func bodySmallStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.bodySmall)
            .foregroundColor(color)
    }

    /// Apply label style (uppercase, small)
    func labelStyle(color: Color = .vinoTextSecondary) -> some View {
        self.font(VinoTypography.labelMedium)
            .foregroundColor(color)
            .textCase(.uppercase)
    }

    /// Apply caption style
    func captionStyle(color: Color = .vinoTextTertiary) -> some View {
        self.font(VinoTypography.captionMedium)
            .foregroundColor(color)
    }

    /// Apply rating value style
    func ratingStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.rating)
            .foregroundColor(color)
    }

    /// Apply stat value style
    func statValueStyle(color: Color = .vinoText) -> some View {
        self.font(VinoTypography.statValue)
            .foregroundColor(color)
    }
}

// MARK: - Styled Text Components

/// Primary text with body styling
struct VinoText: View {
    let text: String
    var style: TextStyle = .body
    var color: Color?

    enum TextStyle {
        case displayLarge, displayMedium, displaySmall
        case titleLarge, titleMedium, titleSmall
        case bodyLarge, body, bodySmall
        case labelLarge, label, labelSmall
        case captionLarge, caption, captionSmall

        var font: Font {
            switch self {
            case .displayLarge: return VinoTypography.displayLarge
            case .displayMedium: return VinoTypography.displayMedium
            case .displaySmall: return VinoTypography.displaySmall
            case .titleLarge: return VinoTypography.titleLarge
            case .titleMedium: return VinoTypography.titleMedium
            case .titleSmall: return VinoTypography.titleSmall
            case .bodyLarge: return VinoTypography.bodyLarge
            case .body: return VinoTypography.bodyMedium
            case .bodySmall: return VinoTypography.bodySmall
            case .labelLarge: return VinoTypography.labelLarge
            case .label: return VinoTypography.labelMedium
            case .labelSmall: return VinoTypography.labelSmall
            case .captionLarge: return VinoTypography.captionLarge
            case .caption: return VinoTypography.captionMedium
            case .captionSmall: return VinoTypography.captionSmall
            }
        }

        var defaultColor: Color {
            switch self {
            case .displayLarge, .displayMedium, .displaySmall,
                 .titleLarge, .titleMedium, .titleSmall,
                 .bodyLarge, .body, .bodySmall:
                return .vinoText
            case .labelLarge, .label, .labelSmall:
                return .vinoTextSecondary
            case .captionLarge, .caption, .captionSmall:
                return .vinoTextTertiary
            }
        }

        var isUppercase: Bool {
            switch self {
            case .labelLarge, .label, .labelSmall:
                return true
            default:
                return false
            }
        }
    }

    var body: some View {
        Text(text)
            .font(style.font)
            .foregroundColor(color ?? style.defaultColor)
            .textCase(style.isUppercase ? .uppercase : nil)
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(alignment: .leading, spacing: 16) {
            Group {
                VinoText(text: "Display Large", style: .displayLarge)
                VinoText(text: "Display Medium", style: .displayMedium)
                VinoText(text: "Title Large", style: .titleLarge)
                VinoText(text: "Title Medium", style: .titleMedium)
                VinoText(text: "Title Small", style: .titleSmall)
            }

            Divider()

            Group {
                VinoText(text: "Body Large - Main content text for reading", style: .bodyLarge)
                VinoText(text: "Body Medium - Standard content text", style: .body)
                VinoText(text: "Body Small - Compact content text", style: .bodySmall)
            }

            Divider()

            Group {
                VinoText(text: "Label Medium", style: .label)
                VinoText(text: "Caption Medium", style: .caption)
            }
        }
        .padding()
    }
    .background(Color.vinoDark)
}
#endif
