import { OpenAI } from "https://deno.land/x/openai@v4.20.1/mod.ts";
import { AI_PROMPTS, getPrompt } from "./ai-prompts-library.ts";

export interface WineEnrichmentData {
  wine_type?: string; // red, white, rosé, sparkling, fortified, dessert
  color?: string;
  style?: string;
  food_pairings?: string[];
  serving_temperature?: string;
  tasting_notes?: string;
  varietals?: string[];
}

export interface WineData {
  producer: string;
  wine_name: string;
  year?: number | null;
  region?: string | null;
  country?: string | null;
  varietals?: string[];
}

/**
 * Enriches wine data with AI-generated metadata
 * This is the centralized enrichment function used by all pipelines
 */
export async function enrichWineWithAI(
  openai: OpenAI,
  wineData: WineData
): Promise<WineEnrichmentData | null> {
  try {
    // Use the shared prompt from the library
    const prompts = getPrompt('WINE_DATA_ENRICHMENT', wineData);

    // Add enrichment-specific fields to the prompt
    const enrichmentPrompt = `${prompts.user}

Additionally, provide the following enrichment data:
8. wine_type: One of "red", "white", "rosé", "sparkling", "fortified", or "dessert"
9. color: Specific color description (e.g., "deep ruby", "pale gold", "light pink")
10. style: Wine style classification (e.g., "dry", "semi-dry", "sweet", "brut", "demi-sec")
11. food_pairings: Array of 4-6 specific food pairing suggestions
12. serving_temperature: Recommended serving temperature range (e.g., "16-18°C", "8-10°C")
13. tasting_notes: Brief tasting note (50-100 words) describing typical characteristics

Return valid JSON with all fields. The varietals field MUST be an array of grape names.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompts.system,
        },
        {
          role: "user",
          content: enrichmentPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    // Parse JSON response
    const enrichedData = JSON.parse(content) as WineEnrichmentData;

    // Ensure varietals is always an array
    if (!Array.isArray(enrichedData.varietals)) {
      enrichedData.varietals = [];
    }

    return enrichedData;
  } catch (error) {
    console.error(`Failed to enrich wine ${wineData.wine_name}:`, error);
    return null;
  }
}

/**
 * Stores grape varietals in the database
 * Creates grape_varietals entries and wine_varietals associations
 */
export async function storeGrapeVarietals(
  supabase: any,
  vintageId: string,
  varietals: string[]
): Promise<void> {
  if (!varietals || varietals.length === 0) return;

  for (const varietalName of varietals) {
    try {
      // Get or create grape varietal
      let { data: varietal } = await supabase
        .from("grape_varietals")
        .select("id")
        .ilike("name", varietalName)
        .single();

      if (!varietal) {
        const { data: newVarietal, error: createError } = await supabase
          .from("grape_varietals")
          .insert({ name: varietalName })
          .select()
          .single();

        if (createError && !createError.message.includes("duplicate")) {
          console.error(`Failed to create varietal ${varietalName}:`, createError);
          continue;
        }
        varietal = newVarietal;
      }

      if (varietal) {
        // Create wine-varietal association
        const { error: assocError } = await supabase
          .from("wine_varietals")
          .insert({
            vintage_id: vintageId,
            varietal_id: varietal.id,
          });

        if (assocError && !assocError.message.includes("duplicate")) {
          console.error(`Failed to associate varietal ${varietalName}:`, assocError);
        }
      }
    } catch (error) {
      // Ignore duplicate key errors
      if (!String(error).includes("duplicate")) {
        console.error(`Failed to process varietal ${varietalName}:`, error);
      }
    }
  }
}

/**
 * Updates a wine record with enrichment data
 * Only updates fields that are missing in the existing wine
 */
export async function updateWineWithEnrichment(
  supabase: any,
  wineId: string,
  enrichmentData: WineEnrichmentData,
  existingWine: any
): Promise<boolean> {
  const updateData: any = {};

  // Only update missing fields
  if (!existingWine.wine_type && enrichmentData.wine_type) {
    updateData.wine_type = enrichmentData.wine_type;
  }
  if (!existingWine.color && enrichmentData.color) {
    updateData.color = enrichmentData.color;
  }
  if (!existingWine.style && enrichmentData.style) {
    updateData.style = enrichmentData.style;
  }
  if (
    (!existingWine.food_pairings || existingWine.food_pairings.length === 0) &&
    enrichmentData.food_pairings
  ) {
    updateData.food_pairings = enrichmentData.food_pairings;
  }
  if (!existingWine.serving_temperature && enrichmentData.serving_temperature) {
    updateData.serving_temperature = enrichmentData.serving_temperature;
  }
  if (!existingWine.tasting_notes && enrichmentData.tasting_notes) {
    updateData.tasting_notes = enrichmentData.tasting_notes;
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from("wines")
      .update(updateData)
      .eq("id", wineId);

    if (updateError) {
      console.error(`Failed to update wine ${wineId}:`, updateError);
      return false;
    }
    return true;
  }

  return false; // No updates needed
}