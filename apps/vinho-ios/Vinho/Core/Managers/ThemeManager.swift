import SwiftUI
import Combine

class ThemeManager: ObservableObject {
    @Published var currentTheme: Theme = .dark
    @Published var accentColor: Color = .vinoAccent
    @Published var hapticEnabled = true

    enum Theme: String, CaseIterable {
        case dark = "Dark"
        case midnight = "Midnight"
        case wine = "Wine"

        var backgroundColor: Color {
            switch self {
            case .dark:
                return .vinoDark
            case .midnight:
                return Color(red: 0, green: 0, blue: 0.098)
            case .wine:
                return Color(red: 0.2, green: 0.05, blue: 0.05)
            }
        }

        var secondaryBackgroundColor: Color {
            switch self {
            case .dark:
                return .vinoDarkSecondary
            case .midnight:
                return Color(red: 0.05, green: 0.05, blue: 0.15)
            case .wine:
                return Color(red: 0.25, green: 0.08, blue: 0.08)
            }
        }
    }
}