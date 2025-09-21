import UIKit
import SwiftUI

class HapticManager: ObservableObject {
    @Published var isEnabled = true

    private let impactLight = UIImpactFeedbackGenerator(style: .light)
    private let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private let impactSoft = UIImpactFeedbackGenerator(style: .soft)
    private let impactRigid = UIImpactFeedbackGenerator(style: .rigid)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()

    init() {
        prepareHaptics()
    }

    private func prepareHaptics() {
        impactLight.prepare()
        impactMedium.prepare()
        impactHeavy.prepare()
        impactSoft.prepare()
        impactRigid.prepare()
        selectionFeedback.prepare()
        notificationFeedback.prepare()
    }

    // MARK: - Impact Haptics
    func lightImpact() {
        guard isEnabled else { return }
        impactLight.impactOccurred()
    }

    func mediumImpact() {
        guard isEnabled else { return }
        impactMedium.impactOccurred()
    }

    func heavyImpact() {
        guard isEnabled else { return }
        impactHeavy.impactOccurred()
    }

    func softImpact() {
        guard isEnabled else { return }
        impactSoft.impactOccurred()
    }

    func rigidImpact() {
        guard isEnabled else { return }
        impactRigid.impactOccurred()
    }

    // MARK: - Selection Haptic
    func selection() {
        guard isEnabled else { return }
        selectionFeedback.selectionChanged()
    }

    // MARK: - Notification Haptics
    func success() {
        guard isEnabled else { return }
        notificationFeedback.notificationOccurred(.success)
    }

    func warning() {
        guard isEnabled else { return }
        notificationFeedback.notificationOccurred(.warning)
    }

    func error() {
        guard isEnabled else { return }
        notificationFeedback.notificationOccurred(.error)
    }

    // MARK: - Complex Patterns
    func doubleTap() {
        guard isEnabled else { return }
        lightImpact()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.mediumImpact()
        }
    }

    func longPress() {
        guard isEnabled else { return }
        softImpact()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.rigidImpact()
        }
    }

    func swipe() {
        guard isEnabled else { return }
        for i in 0..<3 {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.05) { [weak self] in
                self?.lightImpact()
            }
        }
    }
}