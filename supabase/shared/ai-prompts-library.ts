/**
 * Centralized AI Prompts Library
 * These prompts are used across edge functions, server, and iOS apps
 * Keep prompts consistent and maintainable in one place
 */

export const AI_PROMPTS = {
  // Wine Label Extraction
  WINE_LABEL_EXTRACTION: {
    system: "You are a master sommelier with expertise in reading wine labels. Extract ONLY information that is VISIBLE on the label. Output JSON that matches the schema. Use null for missing data, never invent or assume information.",

    user: (ocrText?: string) => `Carefully examine this wine label and extract the following information.
${ocrText ? `\nOCR Text detected: "${ocrText}"` : ""}

CRITICAL EXTRACTION PRIORITIES:
1. Producer/Winery name - Look for the largest or most prominent text
2. Wine name/Cuvée - The specific wine designation or proprietary name
3. Vintage year - Usually a 4-digit number (1990-2025), often near the wine name
4. Grape varieties - CRITICAL: Look for any grape names on the label:
   - Common grapes: Chardonnay, Sauvignon Blanc, Pinot Noir, Cabernet Sauvignon, Merlot, Syrah, Sangiovese, Nebbiolo, Tempranillo
   - May be listed as "100% [grape]" or "[grape] [percentage]%"
   - May appear in small text on back label
   - Some regions require grape disclosure (e.g., "Cépage: Pinot Noir")
5. Region/Appellation - Geographic origin (e.g., "Napa Valley", "Bordeaux", "Etna")
6. Alcohol content - Usually shown as "% ALC/VOL" or "% ABV"
7. Country - May be explicit or inferred from region
8. Producer address - Look for street address, city, postal code on back label
9. Producer website - Often shown as www.something.com or just domain.com

IMPORTANT NOTES:
- For vintage: Look carefully for any 4-digit year. If no year is visible, return null (do NOT assume NV)
- For varietals: Return an empty array if no grape varieties are visible on the label
- Natural wines often have minimal text - extract what you can see
- Some wines use proprietary names instead of varietals - that's okay
- Look carefully for producer contact info on both front and back labels

Return a JSON object with these fields:
- producer: The winery/producer name (required)
- wine_name: The specific wine name/cuvée (required)
- year: The vintage year as integer, or null if not visible
- country: Country of origin or null
- region: Wine region/appellation or null
- varietals: Array of grape variety names (empty array if not visible) - MUST be an array
- abv_percent: Alcohol by volume as number (e.g., 13.5) or null
- confidence: Your confidence level from 0-1 based on label clarity (required)
- producer_website: Website URL if visible or null
- producer_address: Street address if visible or null
- producer_city: City name if visible or null
- producer_postal_code: Postal/zip code if visible or null`
  },

  // Wine Data Enrichment
  WINE_DATA_ENRICHMENT: {
    system: "You are a wine expert. Return valid JSON with accurate grape varietals. The varietals field must be an array of strings.",

    user: (data: any) => `You are a wine expert with extensive knowledge of global wine regions, producers, and grape varietals.

Given this wine information:
- Producer: ${data.producer}
- Wine: ${data.wine_name}
- Year: ${data.year || "unknown"}
- Region: ${data.region || "unknown"}
- Country: ${data.country || "unknown"}
- Current varietals: ${data.varietals?.length > 0 ? data.varietals.join(", ") : "none identified"}
- Website: ${data.producer_website || "unknown"}
- Address: ${data.producer_address || "unknown"}

Based on your knowledge of this specific producer and wine, provide the following:

1. CRITICAL - GRAPE VARIETALS: What grape varieties is this wine made from?
   - For example: Dom Pérignon is always Pinot Noir and Chardonnay
   - Barolo is always 100% Nebbiolo
   - Châteauneuf-du-Pape can be up to 13 grape varieties
   - List the ACTUAL grapes used, not just what's allowed
   - If it's a blend, list all grapes (don't need exact percentages)

2. If the year is missing but this is a known vintage wine (not NV), what year is most likely?
3. What is the specific region/appellation if not provided?
4. What country is this from if not specified?
5. What is the producer's website if you know it?
6. What is the producer's ACTUAL WINERY ADDRESS if known?

IMPORTANT EXAMPLES OF GRAPE VARIETALS:
- Dom Pérignon: ["Pinot Noir", "Chardonnay"]
- Opus One: ["Cabernet Sauvignon", "Merlot", "Cabernet Franc", "Petit Verdot", "Malbec"]
- Sassicaia: ["Cabernet Sauvignon", "Cabernet Franc"]
- Château d'Yquem: ["Sémillon", "Sauvignon Blanc"]
- Barolo: ["Nebbiolo"]
- Brunello di Montalcino: ["Sangiovese"]
- Chablis: ["Chardonnay"]
- Sancerre: ["Sauvignon Blanc"]
- Champagne (traditional): ["Chardonnay", "Pinot Noir", "Pinot Meunier"]

Return JSON with all fields. The varietals field MUST be an array of grape names, even if empty.`
  },

  // Winery Coordinates
  WINERY_COORDINATES: {
    system: "You are a wine geography expert. Return only valid JSON with precise coordinates.",

    user: (producer: string, address?: string, region?: string, country?: string) => `You are a wine geography expert with precise knowledge of winery and vineyard locations.

Find the EXACT coordinates for this winery:
Producer: ${producer}
${address ? `Address: ${address}` : ''}
${region ? `Region: ${region}` : ''}
${country ? `Country: ${country}` : ''}

IMPORTANT:
- Provide the EXACT location of the winery/vineyard, not just the region center
- For example, if it's Benanti winery in Etna, provide the exact coordinates of their vineyard parcels or winery building
- If the producer has multiple vineyard sites, provide the main winery or most famous vineyard location
- Consider terroir significance - slopes, elevation, and specific vineyard sites matter
- If you know the exact location with high confidence, mark confidence as "exact"
- If you can only approximate based on village/town, mark confidence as "approximate"
- If you only know the general region, mark confidence as "region"

Examples of exact locations:
- Benanti's Pietra Marina vineyard: 37.6833, 15.0167 (southeastern slope of Etna)
- Passopisciaro winery: 37.8750, 14.9583 (northern slope of Etna near Passopisciaro village)
- Chateau Margaux: 45.0422, -0.6761 (specific chateau location in Margaux)
- Dom Pérignon (Moët & Chandon): 49.0094, 3.9573 (Abbey of Hautvillers, Champagne)

Return JSON with:
{
  "latitude": number or null,
  "longitude": number or null,
  "confidence": "exact" | "approximate" | "region",
  "location_note": "brief note about the specific location (e.g., 'southeastern slope at 600m elevation')"
}`
  },

  // Wine Recommendations
  WINE_RECOMMENDATIONS: {
    system: "You are a master sommelier with expertise in wine recommendations. Provide personalized suggestions based on user preferences.",

    user: (userPreferences: any, recentWines: any[], city?: string) => `Based on the user's wine preferences and recent tastings, recommend wines available in ${city || 'their area'}.

User Preferences:
- Favorite Regions: ${userPreferences.favorite_regions?.join(', ') || 'Not specified'}
- Favorite Varietals: ${userPreferences.favorite_varietals?.join(', ') || 'Not specified'}
- Favorite Styles: ${userPreferences.favorite_styles?.join(', ') || 'Not specified'}
- Price Range: $${userPreferences.price_range?.low || 20} - $${userPreferences.price_range?.high || 100}

Recent Highly Rated Wines (4-5 stars):
${recentWines.map(w => `- ${w.producer} ${w.wine_name} ${w.year || 'NV'} (${w.region || 'Unknown region'})`).join('\n')}

Provide 5-10 wine recommendations that:
1. Match the user's taste profile based on their favorites
2. Are similar to their highly rated wines
3. Are within their price range
4. Are likely available in ${city || 'wine shops'}
5. Include a mix of safe choices and interesting discoveries

For each recommendation, provide:
- Producer and wine name
- Vintage year (or NV)
- Region and country
- Grape varietals
- Expected price range
- Why this wine (based on their preferences)
- Food pairing suggestion

Return as JSON array with structured wine objects.`
  },

  // Wine List Parsing (Restaurant menus, Vivino imports)
  WINE_LIST_PARSING: {
    system: "You are an expert at parsing wine lists from restaurants and wine apps. Extract structured data from unstructured text.",

    user: (text: string) => `Parse this wine list text and extract structured wine information.

Text to parse:
${text}

For each wine entry, extract:
- Producer/winery name
- Wine name/cuvée
- Vintage year (null if not specified)
- Price (if listed)
- Region/appellation
- Country
- Grape varietals (if mentioned)
- Any special notes (reserve, magnum, etc.)

Common patterns:
- "2019 Domaine X, Burgundy - $120"
- "Château Y Bordeaux Supérieur 2018 ...... 85"
- "Producer Name / Wine Name / Region / Year / Price"

Handle variations like:
- NV (non-vintage) wines
- Wines by the glass vs bottle
- Different price formats ($, €, £, etc.)
- Multiple vintages of the same wine
- Wine descriptions and tasting notes

Return as JSON array of wine objects.`
  },

  // Wine Description Generation
  WINE_DESCRIPTION: {
    system: "You are a wine writer creating engaging, informative descriptions for wines.",

    user: (wine: any) => `Create an engaging description for this wine:

Wine Details:
- Producer: ${wine.producer}
- Wine Name: ${wine.wine_name}
- Vintage: ${wine.year || 'Non-vintage'}
- Region: ${wine.region}, ${wine.country}
- Varietals: ${wine.varietals?.join(', ') || 'Not specified'}
- ABV: ${wine.abv_percent || 'Not specified'}%

Create a wine description that includes:
1. Opening with the wine's character and style
2. Tasting notes (appearance, aroma, palate, finish)
3. Terroir and winemaking influences
4. Food pairing suggestions
5. Serving recommendations (temperature, decanting)
6. Drinking window

Keep it:
- Informative but accessible
- 150-200 words
- Free of pretentious language
- Focused on what makes this wine special

Return as JSON with 'description' field.`
  }
};

// Helper function to format prompts for iOS Swift usage
export function formatForSwift(promptKey: string): string {
  const prompt = (AI_PROMPTS as any)[promptKey];
  if (!prompt) return "";

  // Convert to Swift-friendly format
  const swiftPrompt = {
    systemPrompt: prompt.system,
    userPromptTemplate: typeof prompt.user === 'function'
      ? prompt.user.toString()
      : prompt.user
  };

  return JSON.stringify(swiftPrompt, null, 2);
}

// Helper function to get prompt with parameters
export function getPrompt(promptKey: string, params?: any) {
  const prompt = (AI_PROMPTS as any)[promptKey];
  if (!prompt) {
    throw new Error(`Prompt ${promptKey} not found`);
  }

  return {
    system: prompt.system,
    user: typeof prompt.user === 'function' ? prompt.user(params) : prompt.user
  };
}

// Export for Deno/Edge functions
if (typeof Deno !== 'undefined') {
  (globalThis as any).AI_PROMPTS = AI_PROMPTS;
  (globalThis as any).getPrompt = getPrompt;
}