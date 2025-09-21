import SwiftUI

#if DEBUG
struct PreviewContainer {
    static let shared = PreviewContainer()

    let authManager = AuthManager()
    let hapticManager = HapticManager()
}

// Sample preview data
extension FeedItem {
    static let previewData = FeedItem(
        type: .wine,
        title: "2019 Château Margaux",
        description: "An exceptional vintage from one of Bordeaux's most prestigious estates.",
        imageUrl: nil,
        tags: ["bordeaux", "cabernet-sauvignon"],
        timestamp: Date(),
        likeCount: 42,
        commentCount: 8,
        isLiked: true,
        isSaved: false
    )
}

extension WineWithDetails {
    static let previewData = WineWithDetails(
        name: "Margaux",
        producer: "Château Margaux",
        year: 2019,
        region: "Bordeaux, France",
        varietal: "Cabernet Sauvignon",
        price: 850,
        averageRating: 4.8,
        imageUrl: nil,
        type: .red
    )
}
#endif