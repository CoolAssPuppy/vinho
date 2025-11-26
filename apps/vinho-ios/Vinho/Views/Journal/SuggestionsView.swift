import SwiftUI

/// Simplified Suggestions View that shows visually similar wines
struct SuggestionsView: View {
    let tastings: [TastingNoteWithWine]

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                YouMightLikeSection(hasTastings: !tastings.isEmpty)
            }
            .padding()
        }
        .background(Color.vinoDark)
    }
}
