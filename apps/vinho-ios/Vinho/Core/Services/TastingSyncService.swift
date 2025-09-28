import Foundation
import Supabase

@MainActor
class TastingSyncService: ObservableObject {
    private let client: SupabaseClient

    init() {
        self.client = SupabaseManager.shared.client
    }

    /// Sync pending tasting notes with processed wines
    func syncPendingTastings() async {
        guard let pendingTastings = UserDefaults.standard.array(forKey: "pendingTastings") as? [[String: Any]] else {
            return
        }

        var remainingTastings: [[String: Any]] = []

        for tastingData in pendingTastings {
            guard let winesAddedId = tastingData["wines_added_id"] as? String else {
                continue
            }

            do {
                // Check if the wine has been processed
                let response: [String: Any] = try await client
                    .from("wines_added")
                    .select("status, scan_id")
                    .eq("id", value: winesAddedId)
                    .single()
                    .execute()
                    .value as! [String: Any]

                if let status = response["status"] as? String, status == "completed" {
                    // Get the scan to find the associated tasting
                    if let scanId = response["scan_id"] as? String {
                        // Find the tasting created by the edge function
                        let scanResponse: [String: Any] = try await client
                            .from("scans")
                            .select("user_id")
                            .eq("id", value: scanId)
                            .single()
                            .execute()
                            .value as! [String: Any]

                        if let userId = scanResponse["user_id"] as? String {
                            // Find and update the tasting
                            let tastingResponse: [[String: Any]] = try await client
                                .from("tastings")
                                .select("id, vintage_id")
                                .eq("user_id", value: userId)
                                .order("created_at", ascending: false)
                                .limit(1)
                                .execute()
                                .value as! [[String: Any]]

                            if let tasting = tastingResponse.first,
                               let tastingId = tasting["id"] as? String {
                                // Update the tasting with user's notes
                                var updateData: [String: Any] = [:]

                                if let rating = tastingData["rating"] as? Int, rating > 0 {
                                    updateData["verdict"] = rating
                                }

                                if let notes = tastingData["notes"] as? String, !notes.isEmpty {
                                    updateData["notes"] = notes
                                }

                                if let detailedNotes = tastingData["detailed_notes"] as? String, !detailedNotes.isEmpty {
                                    updateData["detailed_notes"] = detailedNotes
                                }

                                if let locationName = tastingData["location_name"] as? String, !locationName.isEmpty {
                                    updateData["location_name"] = locationName
                                }

                                if let locationCity = tastingData["location_city"] as? String, !locationCity.isEmpty {
                                    updateData["location_city"] = locationCity
                                }

                                if !updateData.isEmpty {
                                    try await client
                                        .from("tastings")
                                        .update(updateData)
                                        .eq("id", value: tastingId)
                                        .execute()
                                }
                            }
                        }
                    }
                } else if let status = response["status"] as? String, status == "pending" || status == "working" {
                    // Keep this tasting for later syncing
                    remainingTastings.append(tastingData)
                }
                // If status is failed or unknown, discard the tasting data

            } catch {
                // If there's an error checking, keep for retry
                remainingTastings.append(tastingData)
            }
        }

        // Update pending tastings with remaining ones
        if remainingTastings.isEmpty {
            UserDefaults.standard.removeObject(forKey: "pendingTastings")
        } else {
            UserDefaults.standard.set(remainingTastings, forKey: "pendingTastings")
        }
    }

    /// Create a fallback tasting for failed wine processing
    func createFallbackTasting(for winesAddedId: String, imageUrl: String) async {
        guard let userId = try? await client.auth.session.user.id else { return }

        // Check pending tastings for this wine
        guard let pendingTastings = UserDefaults.standard.array(forKey: "pendingTastings") as? [[String: Any]],
              let tastingData = pendingTastings.first(where: { ($0["wines_added_id"] as? String) == winesAddedId }) else {
            return
        }

        do {
            // Create a tasting without a vintage (user can edit later)
            var newTasting: [String: Any] = [
                "user_id": userId.uuidString,
                "tasted_at": Date().ISO8601Format(),
                "image_url": imageUrl
            ]

            if let rating = tastingData["rating"] as? Int, rating > 0 {
                newTasting["verdict"] = rating
            }

            if let notes = tastingData["notes"] as? String, !notes.isEmpty {
                newTasting["notes"] = notes
            }

            if let detailedNotes = tastingData["detailed_notes"] as? String, !detailedNotes.isEmpty {
                newTasting["detailed_notes"] = detailedNotes
            }

            if let locationName = tastingData["location_name"] as? String, !locationName.isEmpty {
                newTasting["location_name"] = locationName
            }

            if let locationCity = tastingData["location_city"] as? String, !locationCity.isEmpty {
                newTasting["location_city"] = locationCity
            }

            try await client
                .from("tastings")
                .insert(newTasting)
                .execute()

            // Remove this tasting from pending
            var remainingTastings = pendingTastings.filter { ($0["wines_added_id"] as? String) != winesAddedId }
            if remainingTastings.isEmpty {
                UserDefaults.standard.removeObject(forKey: "pendingTastings")
            } else {
                UserDefaults.standard.set(remainingTastings, forKey: "pendingTastings")
            }

        } catch {
            print("Failed to create fallback tasting: \(error)")
        }
    }
}