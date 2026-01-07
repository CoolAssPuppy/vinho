import SwiftUI
import Supabase

// MARK: - Save Operations Extension

extension WineDetailViewModel {

    func saveProducerName(hapticManager: HapticManager) {
        guard !editedProducer.isEmpty else {
            isEditingProducer = false
            return
        }
        Task {
            isSaving = true
            hapticManager.mediumImpact()
            do {
                let client = SupabaseManager.shared.client
                struct ProducerRow: Decodable { let id: UUID; let name: String }

                let existingProducers: [ProducerRow] = try await client
                    .from("producers").select("id, name")
                    .ilike("name", pattern: editedProducer).limit(1).execute().value

                let producerId: UUID
                if let existingProducer = existingProducers.first {
                    producerId = existingProducer.id
                } else {
                    struct NewProducer: Encodable { let name: String }
                    struct CreatedProducer: Decodable { let id: UUID }
                    let created: [CreatedProducer] = try await client
                        .from("producers").insert(NewProducer(name: editedProducer))
                        .select("id").execute().value
                    guard let newProducer = created.first else {
                        throw NSError(domain: "Producer", code: 1)
                    }
                    producerId = newProducer.id
                }

                struct WineProducerUpdate: Encodable { let producer_id: UUID }
                try await client.from("wines")
                    .update(WineProducerUpdate(producer_id: producerId))
                    .eq("id", value: wine.id.uuidString).execute()

                wine.producer = editedProducer
                isEditingProducer = false
                isSaving = false
                hapticManager.success()
                NotificationCenter.default.post(name: Constants.Notifications.wineDataChanged, object: nil)
            } catch {
                isSaving = false
                hapticManager.error()
            }
        }
    }

    func saveWineName(hapticManager: HapticManager) {
        guard !editedName.isEmpty else {
            isEditingName = false
            return
        }
        Task {
            isSaving = true
            hapticManager.mediumImpact()
            do {
                try await WineService.shared.updateWine(id: wine.id, name: editedName, description: nil)
                wine.name = editedName
                isEditingName = false
                isSaving = false
                hapticManager.success()
                NotificationCenter.default.post(name: Constants.Notifications.wineDataChanged, object: nil)
            } catch {
                isSaving = false
                hapticManager.error()
            }
        }
    }

    func saveWineDescription(hapticManager: HapticManager) {
        Task {
            isSaving = true
            hapticManager.mediumImpact()
            do {
                let desc = editedDescription.isEmpty ? nil : editedDescription
                try await WineService.shared.updateWine(id: wine.id, name: nil, description: desc)
                wine.description = desc
                isEditingDescription = false
                isSaving = false
                hapticManager.success()
                NotificationCenter.default.post(name: Constants.Notifications.wineDataChanged, object: nil)
            } catch {
                isSaving = false
                hapticManager.error()
            }
        }
    }

    func saveWineField(field: String, value: String, hapticManager: HapticManager) {
        Task {
            isSaving = true
            hapticManager.mediumImpact()
            do {
                let client = SupabaseManager.shared.client
                struct WineFieldUpdate: Encodable {
                    var varietal: String?
                    var style: String?
                    var serving_temperature: String?
                    enum CodingKeys: String, CodingKey { case varietal, style, serving_temperature }
                    func encode(to encoder: Encoder) throws {
                        var container = encoder.container(keyedBy: CodingKeys.self)
                        if let v = varietal { try container.encode(v, forKey: .varietal) }
                        if let s = style { try container.encode(s, forKey: .style) }
                        if let st = serving_temperature { try container.encode(st, forKey: .serving_temperature) }
                    }
                }

                var updateData = WineFieldUpdate()
                let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                let finalValue = trimmed.isEmpty ? nil : trimmed

                switch field {
                case "varietal": updateData.varietal = finalValue
                case "style": updateData.style = finalValue
                case "serving_temperature": updateData.serving_temperature = finalValue
                default: break
                }

                try await client.from("wines").update(updateData).eq("id", value: wine.id.uuidString).execute()

                switch field {
                case "varietal": wine.varietal = finalValue; isEditingVarietal = false
                case "style": wine.style = finalValue; isEditingStyle = false
                case "serving_temperature": wine.servingTemperature = finalValue; isEditingServingTemp = false
                default: break
                }
                isSaving = false
                hapticManager.success()
                NotificationCenter.default.post(name: Constants.Notifications.wineDataChanged, object: nil)
            } catch {
                isSaving = false
                hapticManager.error()
            }
        }
    }

    func enrichWineWithAI(hapticManager: HapticManager) async {
        isEnrichingWithAI = true
        do {
            let client = SupabaseManager.shared.client

            struct EnrichRequest: Encodable {
                let action: String; let wine_id: String; let vintage_id: String?
                let producer: String; let wine_name: String; let year: Int?
                let region: String?; let overwrite: Bool
            }
            struct EnrichmentData: Decodable {
                let wine_type: String?; let color: String?; let style: String?
                let food_pairings: [String]?; let serving_temperature: String?
                let tasting_notes: String?; let varietals: [String]?
            }
            struct EnrichResponse: Decodable {
                let success: Bool; let enrichment: EnrichmentData?
            }

            let request = EnrichRequest(
                action: "enrich-single", wine_id: wine.id.uuidString,
                vintage_id: wine.vintageId?.uuidString, producer: wine.producer,
                wine_name: wine.name, year: wine.year, region: wine.region, overwrite: true
            )
            let response: EnrichResponse = try await client.functions.invoke(
                "enrich-wines", options: FunctionInvokeOptions(body: request)
            )

            if response.success, let e = response.enrichment {
                if let t = e.wine_type { wine.type = WineType(rawValue: t) ?? wine.type }
                if let s = e.style { wine.style = s }
                if let st = e.serving_temperature { wine.servingTemperature = st }
                if let fp = e.food_pairings { wine.foodPairings = fp }
                if let tn = e.tasting_notes { wine.description = tn }
                if let v = e.varietals, !v.isEmpty { wine.varietal = v.joined(separator: ", ") }
                if let c = e.color { wine.color = c }
                isEnrichingWithAI = false
                hapticManager.success()
                NotificationCenter.default.post(name: Constants.Notifications.wineDataChanged, object: nil)
            } else {
                throw NSError(domain: "Enrichment", code: 1)
            }
        } catch {
            isEnrichingWithAI = false
            hapticManager.error()
        }
    }
}
