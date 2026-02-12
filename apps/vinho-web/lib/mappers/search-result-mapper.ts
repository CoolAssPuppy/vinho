import type { Tasting } from "@/lib/types/shared";

interface SearchResult {
  tasting_id: string;
  verdict: number | null;
  notes: string | null;
  location_name: string | null;
  vintage_year: number | null;
  wine_name: string | null;
  producer_name: string | null;
}

export function mapSearchResultToTasting(result: SearchResult): Tasting {
  return {
    id: result.tasting_id,
    verdict: result.verdict,
    notes: result.notes,
    detailed_notes: null,
    tasted_at: new Date().toISOString().split("T")[0],
    location_name: result.location_name,
    location_address: null,
    location_city: null,
    location_latitude: null,
    location_longitude: null,
    image_url: null,
    created_at: null,
    updated_at: null,
    user_id: null,
    embedding: null,
    search_text: null,
    vintage: {
      id: "search-result",
      year: result.vintage_year,
      created_at: null,
      wine: {
        id: "search-result-wine",
        name: result.wine_name || "Unknown Wine",
        tasting_notes: null,
        created_at: null,
        color: null,
        food_pairings: null,
        image_url: null,
        is_nv: null,
        serving_temperature: null,
        style: null,
        wine_type: null,
        producer: {
          id: "search-result-producer",
          name: result.producer_name || "Unknown Producer",
          address: null,
          city: null,
          created_at: null,
          latitude: null,
          longitude: null,
          postal_code: null,
          region_id: null,
          website: null,
        },
      },
    },
  } as Tasting;
}

export function mapSearchResultsToTastings(results: SearchResult[]): Tasting[] {
  return results.map(mapSearchResultToTasting);
}
