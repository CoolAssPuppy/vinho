import SwiftUI

extension Color {
    // Primary Colors
    static let vinoPrimary = Color(red: 0.722, green: 0.255, blue: 0.255) // #B84141 - Wine Red
    static let vinoAccent = Color(red: 0.851, green: 0.651, blue: 0.478) // #D9A67A - Gold

    // Background Colors
    static let vinoDark = Color(red: 0.078, green: 0.078, blue: 0.086) // #141416 - Deep Dark
    static let vinoDarkSecondary = Color(red: 0.110, green: 0.110, blue: 0.118) // #1C1C1E - Card Background
    static let vinoDarkTertiary = Color(red: 0.157, green: 0.157, blue: 0.169) // #28282B - Elevated Surface

    // Text Colors
    static let vinoText = Color(red: 0.949, green: 0.949, blue: 0.969) // #F2F2F7 - Primary Text
    static let vinoTextSecondary = Color(red: 0.557, green: 0.557, blue: 0.576) // #8E8E93 - Secondary Text
    static let vinoTextTertiary = Color(red: 0.329, green: 0.329, blue: 0.345) // #545458 - Tertiary Text

    // Semantic Colors
    static let vinoSuccess = Color(red: 0.196, green: 0.843, blue: 0.294) // #32D74B - Success Green
    static let vinoWarning = Color(red: 1.0, green: 0.584, blue: 0.0) // #FF9500 - Warning Orange
    static let vinoError = Color(red: 1.0, green: 0.231, blue: 0.188) // #FF3B30 - Error Red

    // Special Colors
    static let vinoGold = Color(red: 0.941, green: 0.784, blue: 0.353) // #F0C85A - Premium Gold
    static let vinoSilver = Color(red: 0.682, green: 0.682, blue: 0.698) // #AEAEB2 - Silver
    static let vinoBronze = Color(red: 0.804, green: 0.498, blue: 0.196) // #CD7F32 - Bronze

    // Gradient Colors
    static let vinoGradientStart = Color(red: 0.722, green: 0.255, blue: 0.255)
    static let vinoGradientEnd = Color(red: 0.451, green: 0.125, blue: 0.125)

    // Interactive States
    static let vinoHover = Color(red: 0.922, green: 0.922, blue: 0.961).opacity(0.08)
    static let vinoPressed = Color(red: 0.922, green: 0.922, blue: 0.961).opacity(0.12)
    static let vinoDisabled = Color(red: 0.557, green: 0.557, blue: 0.576).opacity(0.3)

    // Border Colors
    static let vinoBorder = Color(red: 0.329, green: 0.329, blue: 0.345).opacity(0.2)
    static let vinoBorderLight = Color(red: 0.557, green: 0.557, blue: 0.576).opacity(0.1)

    // Shadow Colors
    static let vinoShadow = Color.black.opacity(0.4)

    // Glass Effect
    static let vinoGlass = Color.white.opacity(0.05)
    static let vinoGlassBorder = Color.white.opacity(0.1)
}

// Gradients
extension LinearGradient {
    static let vinoGradient = LinearGradient(
        colors: [Color.vinoGradientStart, Color.vinoGradientEnd],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let vinoCardGradient = LinearGradient(
        colors: [Color.vinoDarkSecondary, Color.vinoDarkTertiary],
        startPoint: .top,
        endPoint: .bottom
    )

    static let vinoShimmer = LinearGradient(
        colors: [
            Color.white.opacity(0),
            Color.white.opacity(0.1),
            Color.white.opacity(0)
        ],
        startPoint: .leading,
        endPoint: .trailing
    )

    static let vinoGoldGradient = LinearGradient(
        colors: [Color.vinoGold, Color.vinoAccent],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}