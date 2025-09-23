import Foundation

struct WineStats: Codable {
    let userId: UUID
    let totalTastings: Int
    let uniqueWines: Int
    let uniqueProducers: Int
    let uniqueRegions: Int
    let uniqueCountries: Int
    let whiteWines: Int
    let redWines: Int
    let roseWines: Int
    let sparklingWines: Int
    let fortifiedWines: Int
    let uniqueTastingLocations: Int
    let tastingsLast30Days: Int
    let averageRating: Double?
    let favorites: Int

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case totalTastings = "total_tastings"
        case uniqueWines = "unique_wines"
        case uniqueProducers = "unique_producers"
        case uniqueRegions = "unique_regions"
        case uniqueCountries = "unique_countries"
        case whiteWines = "white_wines"
        case redWines = "red_wines"
        case roseWines = "rose_wines"
        case sparklingWines = "sparkling_wines"
        case fortifiedWines = "fortified_wines"
        case uniqueTastingLocations = "unique_tasting_locations"
        case tastingsLast30Days = "tastings_last_30_days"
        case averageRating = "average_rating"
        case favorites = "favorites"
    }
}