import type { createClient } from "@/lib/supabase";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

export interface WineEnrichmentInput {
  wineId: string;
  vintageId: string;
  producer: string;
  wineName: string;
  year: number | null;
  region: string | null;
  overwrite?: boolean;
}

export interface WineEnrichment {
  varietals?: string[];
  style?: string;
  serving_temperature?: string;
  food_pairings?: string[];
  tasting_notes?: string;
}

interface EnrichWineResponse {
  success?: boolean;
  enrichment?: WineEnrichment;
}

/**
 * Enrich a wine via the enrich-wines edge function.
 *
 * Uses `functions.invoke`, which attaches the caller's session automatically,
 * instead of hand-building the URL and Authorization header in the UI.
 * Returns the enrichment payload, or null if the function reported no result.
 */
export async function enrichWine(
  supabase: SupabaseBrowserClient,
  input: WineEnrichmentInput,
): Promise<WineEnrichment | null> {
  const { data, error } = await supabase.functions.invoke("enrich-wines", {
    body: {
      action: "enrich-single",
      wine_id: input.wineId,
      vintage_id: input.vintageId,
      producer: input.producer,
      wine_name: input.wineName,
      year: input.year,
      region: input.region,
      overwrite: input.overwrite ?? true,
    },
  });

  if (error) throw error;

  const result = data as EnrichWineResponse | null;
  if (result?.success && result.enrichment) {
    return result.enrichment;
  }
  return null;
}
