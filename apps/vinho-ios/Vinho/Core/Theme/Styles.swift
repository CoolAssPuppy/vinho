import SwiftUI

// MARK: - Spacing Constants

enum VinoSpacing {
    static let xxxs: CGFloat = 2
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}

// MARK: - Corner Radius Constants

enum VinoRadius {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let full: CGFloat = 9999
}

// MARK: - Card Style Modifier

struct CardStyle: ViewModifier {
    var cornerRadius: CGFloat = VinoRadius.lg
    var backgroundColor: Color = .vinoDarkSecondary
    var borderColor: Color? = nil
    var shadowRadius: CGFloat = 0
    var padding: CGFloat = VinoSpacing.md

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(backgroundColor)
                    .overlay(
                        Group {
                            if let border = borderColor {
                                RoundedRectangle(cornerRadius: cornerRadius)
                                    .stroke(border, lineWidth: 1)
                            }
                        }
                    )
            )
            .shadow(color: .vinoShadow, radius: shadowRadius, x: 0, y: shadowRadius > 0 ? 4 : 0)
    }
}

extension View {
    /// Apply standard card styling
    func cardStyle(
        cornerRadius: CGFloat = VinoRadius.lg,
        backgroundColor: Color = .vinoDarkSecondary,
        borderColor: Color? = nil,
        shadowRadius: CGFloat = 0,
        padding: CGFloat = VinoSpacing.md
    ) -> some View {
        modifier(CardStyle(
            cornerRadius: cornerRadius,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            shadowRadius: shadowRadius,
            padding: padding
        ))
    }

    /// Apply elevated card style with shadow
    func elevatedCardStyle(cornerRadius: CGFloat = VinoRadius.lg) -> some View {
        cardStyle(
            cornerRadius: cornerRadius,
            backgroundColor: .vinoDarkSecondary,
            shadowRadius: 8
        )
    }

    /// Apply glass card style
    func glassCardStyle(cornerRadius: CGFloat = VinoRadius.lg) -> some View {
        cardStyle(
            cornerRadius: cornerRadius,
            backgroundColor: .vinoGlass,
            borderColor: .vinoGlassBorder
        )
    }

    /// Apply accent bordered card style
    func accentCardStyle(accentColor: Color = .vinoAccent, cornerRadius: CGFloat = VinoRadius.lg) -> some View {
        cardStyle(
            cornerRadius: cornerRadius,
            backgroundColor: .vinoDark,
            borderColor: accentColor.opacity(0.2)
        )
    }
}

// MARK: - Button Styles

struct VinoPrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false
    var isDisabled: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(VinoTypography.buttonText)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, VinoSpacing.sm)
            .padding(.horizontal, VinoSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.md)
                    .fill(isDisabled ? Color.vinoDisabled : LinearGradient.vinoGradient)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct VinoSecondaryButtonStyle: ButtonStyle {
    var isDisabled: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(VinoTypography.buttonText)
            .foregroundColor(isDisabled ? .vinoTextTertiary : .vinoAccent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, VinoSpacing.sm)
            .padding(.horizontal, VinoSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.md)
                    .stroke(isDisabled ? Color.vinoDisabled : Color.vinoAccent, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct VinoGhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(VinoTypography.buttonText)
            .foregroundColor(.vinoAccent)
            .padding(.vertical, VinoSpacing.xs)
            .padding(.horizontal, VinoSpacing.sm)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.sm)
                    .fill(configuration.isPressed ? Color.vinoPressed : Color.clear)
            )
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct VinoIconButtonStyle: ButtonStyle {
    var size: CGFloat = 44

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: size, height: size)
            .background(
                Circle()
                    .fill(configuration.isPressed ? Color.vinoPressed : Color.vinoGlass)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == VinoPrimaryButtonStyle {
    static var vinoPrimary: VinoPrimaryButtonStyle { VinoPrimaryButtonStyle() }
}

extension ButtonStyle where Self == VinoSecondaryButtonStyle {
    static var vinoSecondary: VinoSecondaryButtonStyle { VinoSecondaryButtonStyle() }
}

extension ButtonStyle where Self == VinoGhostButtonStyle {
    static var vinoGhost: VinoGhostButtonStyle { VinoGhostButtonStyle() }
}

extension ButtonStyle where Self == ScaleButtonStyle {
    static var vinoScale: ScaleButtonStyle { ScaleButtonStyle() }
}

// MARK: - Input Field Styles

struct VinoTextFieldStyle: TextFieldStyle {
    var isFocused: Bool = false

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(VinoTypography.bodyMedium)
            .foregroundColor(.vinoText)
            .padding(VinoSpacing.sm)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.md)
                    .fill(Color.vinoDarkSecondary)
                    .overlay(
                        RoundedRectangle(cornerRadius: VinoRadius.md)
                            .stroke(isFocused ? Color.vinoAccent : Color.vinoBorder, lineWidth: 1)
                    )
            )
    }
}

extension View {
    /// Apply vino text field styling
    func vinoTextFieldStyle(isFocused: Bool = false) -> some View {
        self
            .font(VinoTypography.bodyMedium)
            .foregroundColor(.vinoText)
            .padding(VinoSpacing.sm)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.md)
                    .fill(Color.vinoDarkSecondary)
                    .overlay(
                        RoundedRectangle(cornerRadius: VinoRadius.md)
                            .stroke(isFocused ? Color.vinoAccent : Color.vinoBorder, lineWidth: 1)
                    )
            )
    }

    /// Apply vino text editor styling
    func vinoTextEditorStyle(minHeight: CGFloat = 100) -> some View {
        self
            .font(VinoTypography.bodyMedium)
            .foregroundColor(.vinoText)
            .scrollContentBackground(.hidden)
            .padding(VinoSpacing.sm)
            .frame(minHeight: minHeight)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.md)
                    .fill(Color.vinoDarkSecondary)
                    .overlay(
                        RoundedRectangle(cornerRadius: VinoRadius.md)
                            .stroke(Color.vinoBorder, lineWidth: 1)
                    )
            )
    }
}

// MARK: - Container Styles

extension View {
    /// Apply page container styling
    func pageContainer() -> some View {
        self
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.vinoDark.ignoresSafeArea())
    }

    /// Apply section container with optional title
    func sectionContainer() -> some View {
        self
            .padding(VinoSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: VinoRadius.xl)
                    .fill(Color.vinoDarkSecondary)
            )
    }

    /// Apply pill/chip styling
    func pillStyle(
        isSelected: Bool = false,
        selectedColor: Color = .vinoAccent
    ) -> some View {
        self
            .font(VinoTypography.labelMedium)
            .foregroundColor(isSelected ? .white : .vinoTextSecondary)
            .padding(.horizontal, VinoSpacing.sm)
            .padding(.vertical, VinoSpacing.xs)
            .background(
                Capsule()
                    .fill(isSelected ? selectedColor : Color.vinoDarkSecondary)
                    .overlay(
                        Capsule()
                            .stroke(isSelected ? Color.clear : Color.vinoBorder, lineWidth: 1)
                    )
            )
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView {
        VStack(spacing: 24) {
            // Cards
            VStack(alignment: .leading, spacing: 8) {
                Text("Cards").titleMediumStyle()
                Text("Standard Card").bodyMediumStyle()
                    .cardStyle()
                Text("Elevated Card").bodyMediumStyle()
                    .elevatedCardStyle()
                Text("Accent Card").bodyMediumStyle()
                    .accentCardStyle()
                Text("Glass Card").bodyMediumStyle()
                    .glassCardStyle()
            }

            Divider()

            // Buttons
            VStack(spacing: 12) {
                Text("Buttons").titleMediumStyle()
                Button("Primary Button") {}
                    .buttonStyle(.vinoPrimary)
                Button("Secondary Button") {}
                    .buttonStyle(.vinoSecondary)
                Button("Ghost Button") {}
                    .buttonStyle(.vinoGhost)
            }

            Divider()

            // Pills
            VStack(alignment: .leading, spacing: 8) {
                Text("Pills").titleMediumStyle()
                HStack {
                    Text("Selected").pillStyle(isSelected: true)
                    Text("Unselected").pillStyle(isSelected: false)
                }
            }

            Divider()

            // Text Field
            VStack(alignment: .leading, spacing: 8) {
                Text("Input").titleMediumStyle()
                TextField("Placeholder", text: .constant(""))
                    .vinoTextFieldStyle()
            }
        }
        .padding()
    }
    .pageContainer()
}
#endif
