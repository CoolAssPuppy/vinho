import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.20.1/mod.ts";
import { AI_PROMPTS, getPrompt } from "../../shared/ai-prompts-library.ts";
import {
  enrichWineWithAI,
  storeGrapeVarietals,
  updateWineWithEnrichment,
  type WineData,
  type WineEnrichmentData
} from "../../shared/wine-enrichment.ts";
import {
  handleCorsPreFlight,
  getCorsHeaders,
  isValidImageUrl,
} from "../../shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const JINA_API_KEY = Deno.env.get("JINA_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Initialize Supabase's built-in embedding model for vector matching
const embeddingModel = new Supabase.ai.Session("gte-small");

// Vector matching configuration
const VECTOR_MATCH_THRESHOLD = 0.90; // High confidence required for auto-match
const VECTOR_MATCH_MIN_COMPLETENESS = 0.5; // Require at least 50% data completeness

// Visual embedding configuration (Jina CLIP + Vector Buckets)
const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-clip-v1";
const VECTOR_BUCKET = "wine-labels";
const VECTOR_INDEX = "visual-embeddings";
const VISUAL_MATCH_THRESHOLD = 0.92; // High threshold for visual matches

// ============================================================================
// VECTOR MATCHING FUNCTIONS
// ============================================================================

interface VectorMatchResult {
  matched: boolean;
  wineId?: string;
  wineName?: string;
  producerName?: string;
  similarity?: number;
  matchMethod?: string;
}

interface VisualMatchResult {
  matched: boolean;
  wineId?: string;
  wineName?: string;
  producerName?: string;
  similarity?: number;
  vintageId?: string;
}

/**
 * Generate text embedding using Supabase's built-in gte-small model
 */
async function generateTextEmbedding(text: string): Promise<number[]> {
  const output = await embeddingModel.run(text, {
    mean_pool: true,
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Build a search query from OCR text or extracted wine data
 * This creates a text similar to our identity text format for matching
 */
function buildSearchQuery(ocrText: string | null, extractedData?: ExtractedWineData): string {
  // If we have extracted data, use it for better matching
  if (extractedData) {
    const parts: string[] = [];
    parts.push(extractedData.producer || "Unknown Producer");
    parts.push(extractedData.wine_name || "Unknown Wine");

    if (extractedData.region) {
      let regionPart = extractedData.region;
      if (extractedData.country) {
        regionPart += ", " + extractedData.country;
      }
      parts.push(regionPart);
    } else if (extractedData.country) {
      parts.push(extractedData.country);
    }

    if (extractedData.varietals && extractedData.varietals.length > 0) {
      parts.push(extractedData.varietals.join(", "));
    }

    return parts.join(" | ");
  }

  // Fall back to cleaned OCR text
  if (ocrText && ocrText.length > 10) {
    // Clean up OCR text - remove excessive whitespace and normalize
    return ocrText
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 500); // Limit length
  }

  return "";
}

/**
 * Attempt to match wine using vector search
 * Returns match info if a high-confidence match is found
 */
async function attemptVectorMatch(
  ocrText: string | null,
  extractedData?: ExtractedWineData
): Promise<VectorMatchResult> {
  // Build search query
  const searchQuery = buildSearchQuery(ocrText, extractedData);

  if (!searchQuery || searchQuery.length < 10) {
    console.log("Insufficient data for vector matching");
    return { matched: false };
  }

  try {
    console.log(`Attempting vector match with query: "${searchQuery.substring(0, 100)}..."`);

    // Generate embedding from search query
    const embedding = await generateTextEmbedding(searchQuery);

    // Search for matches using our stored function
    const { data: matches, error } = await supabase.rpc("match_wine_by_identity", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: VECTOR_MATCH_THRESHOLD - 0.05, // Slightly lower for initial search
      match_count: 3,
    });

    if (error) {
      console.error("Vector search error:", error);
      return { matched: false };
    }

    if (!matches || matches.length === 0) {
      console.log("No vector matches found");
      return { matched: false };
    }

    const bestMatch = matches[0];
    console.log(
      `Best match: "${bestMatch.producer_name} - ${bestMatch.wine_name}" ` +
      `(similarity: ${bestMatch.similarity.toFixed(3)}, completeness: ${bestMatch.data_completeness})`
    );

    // High confidence match - both similarity and data completeness must meet thresholds
    if (
      bestMatch.similarity >= VECTOR_MATCH_THRESHOLD &&
      bestMatch.data_completeness >= VECTOR_MATCH_MIN_COMPLETENESS
    ) {
      console.log(`Vector match found: ${bestMatch.wine_name} (${bestMatch.similarity.toFixed(3)})`);
      return {
        matched: true,
        wineId: bestMatch.wine_id,
        wineName: bestMatch.wine_name,
        producerName: bestMatch.producer_name,
        similarity: bestMatch.similarity,
      };
    }

    console.log(
      `Match below threshold (need similarity >= ${VECTOR_MATCH_THRESHOLD} and completeness >= ${VECTOR_MATCH_MIN_COMPLETENESS})`
    );
    return { matched: false };
  } catch (error) {
    console.error("Vector match error:", error);
    return { matched: false };
  }
}

// ============================================================================
// VISUAL EMBEDDING FUNCTIONS (Jina CLIP + Vector Buckets)
// ============================================================================

/**
 * Generate image embedding using Jina CLIP v1
 * Returns a 768-dimensional vector
 */
async function generateVisualEmbedding(imageUrl: string): Promise<number[] | null> {
  if (!JINA_API_KEY) {
    console.log("JINA_API_KEY not configured - skipping visual matching");
    return null;
  }

  // SSRF protection - validate image URL before sending to external API
  if (!isValidImageUrl(imageUrl)) {
    console.error(`Rejected invalid image URL for visual embedding: ${imageUrl}`);
    return null;
  }

  try {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: [{ image: imageUrl }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jina API error:", response.status, errorText);
      return null;
    }

    const result = await response.json();

    if (!result.data || result.data.length === 0) {
      console.error("No embedding returned from Jina API");
      return null;
    }

    console.log(`Generated visual embedding with ${result.data[0].embedding.length} dimensions`);
    return result.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate visual embedding:", error);
    return null;
  }
}

/**
 * Search for similar images in Vector Bucket
 */
async function searchVisualMatches(
  embedding: number[],
  topK: number = 5
): Promise<Array<{ key: string; similarity: number; metadata: Record<string, unknown> }>> {
  try {
    const index = supabase.storage.vectors
      .from(VECTOR_BUCKET)
      .index(VECTOR_INDEX);

    const { data, error } = await index.queryVectors({
      queryVector: { float32: embedding },
      topK,
      returnDistance: true,
      returnMetadata: true,
    });

    if (error) {
      console.error("Vector search error:", error);
      return [];
    }

    if (!data?.vectors) {
      return [];
    }

    // Convert distance to similarity (cosine: similarity = 1 - distance)
    return data.vectors.map((v: { key: string; distance?: number; metadata?: Record<string, unknown> }) => ({
      key: v.key,
      similarity: 1 - (v.distance || 0),
      metadata: v.metadata || {},
    }));
  } catch (error) {
    console.error("Visual search error:", error);
    return [];
  }
}

/**
 * Attempt to match wine using visual embeddings (image similarity)
 * This uses Jina CLIP to generate image embeddings and searches Vector Buckets
 */
async function attemptVisualMatch(imageUrl: string): Promise<VisualMatchResult> {
  // Generate embedding from the scanned image
  const embedding = await generateVisualEmbedding(imageUrl);

  if (!embedding) {
    return { matched: false };
  }

  try {
    console.log("Searching for visual matches in Vector Bucket...");

    // Search for similar images
    const matches = await searchVisualMatches(embedding, 3);

    if (matches.length === 0) {
      console.log("No visual matches found in Vector Bucket");
      return { matched: false };
    }

    const bestMatch = matches[0];
    console.log(
      `Best visual match: key="${bestMatch.key}" ` +
      `(similarity: ${bestMatch.similarity.toFixed(3)})`
    );

    // Only accept high-confidence visual matches
    if (bestMatch.similarity >= VISUAL_MATCH_THRESHOLD) {
      const metadata = bestMatch.metadata as Record<string, string>;
      const wineId = metadata.wine_id;

      if (!wineId) {
        console.log("Visual match found but no wine_id in metadata");
        return { matched: false };
      }

      // Get wine details
      const { data: wine } = await supabase
        .from("wines")
        .select("id, name, producer:producers(name)")
        .eq("id", wineId)
        .single();

      if (!wine) {
        console.log(`Wine ${wineId} not found in database`);
        return { matched: false };
      }

      console.log(
        `Visual match found: ${(wine.producer as { name: string })?.name} - ${wine.name} ` +
        `(${(bestMatch.similarity * 100).toFixed(1)}% similarity)`
      );

      return {
        matched: true,
        wineId: wine.id,
        wineName: wine.name,
        producerName: (wine.producer as { name: string })?.name,
        similarity: bestMatch.similarity,
        vintageId: metadata.vintage_id,
      };
    }

    console.log(`Visual match below threshold (need >= ${VISUAL_MATCH_THRESHOLD})`);
    return { matched: false };
  } catch (error) {
    console.error("Visual match error:", error);
    return { matched: false };
  }
}

/**
 * Store visual embedding for a new wine in Vector Bucket
 * This calls the generate-visual-embedding edge function
 */
async function storeVisualEmbedding(
  imageUrl: string,
  wineId: string,
  vintageId: string | null,
  scanId: string | null,
  producerName: string,
  wineName: string
): Promise<void> {
  try {
    // Call the generate-visual-embedding edge function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-visual-embedding`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          wine_id: wineId,
          vintage_id: vintageId,
          scan_id: scanId,
          producer_name: producerName,
          wine_name: wineName,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to store visual embedding:", response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log(`Stored visual embedding for wine ${wineId}: key=${result.key}`);
  } catch (error) {
    console.error("Error storing visual embedding:", error);
    // Don't fail the main job if visual embedding fails
  }
}

/**
 * Queue a wine for embedding generation
 */
async function queueEmbeddingGeneration(
  wineId: string,
  scanId: string | null,
  priority: number = 1
): Promise<void> {
  // Get the identity text for this wine
  const { data: identityText, error: textError } = await supabase.rpc(
    "generate_wine_identity_text",
    { p_wine_id: wineId }
  );

  if (textError || !identityText) {
    console.error(`Failed to generate identity text for wine ${wineId}:`, textError);
    return;
  }

  // Create idempotency key to prevent duplicate jobs
  const idempotencyKey = `identity_${wineId}`;

  const { error } = await supabase.from("embedding_jobs_queue").upsert(
    {
      job_type: "wine_identity",
      wine_id: wineId,
      scan_id: scanId,
      input_text: identityText,
      priority,
      idempotency_key: idempotencyKey,
      status: "pending",
    },
    {
      onConflict: "idempotency_key",
      ignoreDuplicates: true,
    }
  );

  if (error && !error.message.includes("duplicate")) {
    console.error(`Failed to queue embedding job for wine ${wineId}:`, error);
  } else {
    console.log(`Queued embedding generation for wine ${wineId}`);
  }
}

/**
 * Create a tasting record for a vector-matched wine
 */
async function createTastingFromVectorMatch(
  job: WineQueueItem,
  wineId: string,
  vintageId: string,
  similarity: number
): Promise<void> {
  // Get scan date
  let scanDate: string | null = null;
  if (job.scan_id) {
    const { data: scan } = await supabase
      .from("scans")
      .select("created_at")
      .eq("id", job.scan_id)
      .single();

    if (scan?.created_at) {
      scanDate = scan.created_at.split("T")[0];
    }
  }

  const tastedAtDate = scanDate || new Date().toISOString().split("T")[0];

  // Create tasting record
  const { error: tastingError } = await supabase.from("tastings").insert({
    user_id: job.user_id,
    vintage_id: vintageId,
    verdict: null,
    notes: `Wine identified via vector matching (${(similarity * 100).toFixed(1)}% confidence). Scanned on ${new Date(tastedAtDate).toLocaleDateString()}.`,
    tasted_at: tastedAtDate,
    image_url: job.image_url,
  });

  if (tastingError) {
    console.error(`Failed to create tasting for vector match:`, tastingError);
  } else {
    console.log(`Created tasting for vector-matched wine ${wineId}`);
  }
}

// ============================================================================
// END VECTOR MATCHING FUNCTIONS
// ============================================================================

// Define types
interface WineQueueItem {
  id: string;
  user_id: string;
  image_url: string;
  ocr_text: string | null;
  scan_id: string | null;
  retry_count: number;
  idempotency_key: string | null;
  processed_data: any | null;
  status: string;
}

interface ExtractedWineData {
  producer: string;
  wine_name: string;
  year: number | null;
  country: string | null;
  region: string | null;
  varietals: string[];
  abv_percent: number | null;
  confidence: number;
  producer_website?: string | null;
  producer_address?: string | null;
  producer_city?: string | null;
  producer_postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// JSON Schema for OpenAI extraction
const WINE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    producer: { type: "string" },
    wine_name: { type: "string" },
    year: { type: ["integer", "null"] },
    country: { type: ["string", "null"] },
    region: { type: ["string", "null"] },
    varietals: {
      type: "array",
      items: { type: "string" },
    },
    abv_percent: { type: ["number", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    producer_website: { type: ["string", "null"] },
    producer_address: { type: ["string", "null"] },
    producer_city: { type: ["string", "null"] },
    producer_postal_code: { type: ["string", "null"] },
    latitude: { type: ["number", "null"] },
    longitude: { type: ["number", "null"] },
  },
  required: ["producer", "wine_name", "confidence"],
  additionalProperties: false,
};

// Compute SHA256 hash for idempotency
async function computeIdempotencyKey(
  imageUrl: string,
  ocrText: string | null,
): Promise<string> {
  const data = new TextEncoder().encode(`${imageUrl}|${ocrText || ""}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Enrich wine data using knowledge base
async function enrichWineData(
  data: ExtractedWineData,
): Promise<ExtractedWineData> {
  // Skip enrichment if we have all critical data including producer location
  if (
    data.year &&
    data.varietals.length > 0 &&
    data.region &&
    data.country &&
    data.producer_website &&
    (data.latitude || data.producer_address)
  ) {
    return data;
  }

  const prompts = getPrompt('WINE_DATA_ENRICHMENT', data);
  const enrichPrompt = prompts.user;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompts.system,
        },
        { role: "user", content: enrichPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return data;

    const enriched = JSON.parse(content) as ExtractedWineData;

    // Handle year field parsing from enrichment (may return string with multiple years)
    let enrichedYear = enriched.year;
    if (enrichedYear !== null && enrichedYear !== undefined) {
      if (typeof enrichedYear === "string") {
        // Try to extract first 4-digit year from the string
        const yearMatch = String(enrichedYear).match(/\b(19\d{2}|20[0-2]\d)\b/);
        if (yearMatch) {
          enrichedYear = parseInt(yearMatch[1]);
        } else {
          console.log(
            `Could not parse year from enrichment: "${enrichedYear}", keeping original`,
          );
          enrichedYear = null;
        }
      } else if (typeof enrichedYear === "number") {
        // Validate the year is reasonable
        if (enrichedYear < 1900 || enrichedYear > 2025) {
          console.log(
            `Invalid enriched year ${enrichedYear}, keeping original`,
          );
          enrichedYear = null;
        }
      }
    }

    // Merge enriched data, keeping original when available
    return {
      ...data,
      year: data.year || enrichedYear,
      varietals:
        data.varietals.length > 0 ? data.varietals : enriched.varietals || [],
      region: data.region || enriched.region,
      country: data.country || enriched.country,
      abv_percent: data.abv_percent || enriched.abv_percent,
      producer_website: data.producer_website || enriched.producer_website,
      producer_address: data.producer_address || enriched.producer_address,
      producer_city: data.producer_city || enriched.producer_city,
      producer_postal_code:
        data.producer_postal_code || enriched.producer_postal_code,
      latitude: data.latitude || enriched.latitude,
      longitude: data.longitude || enriched.longitude,
    };
  } catch (error) {
    console.error("Enrichment failed, using original data:", error);
    return data;
  }
}

// Extract wine data using OpenAI Vision
async function extractWithOpenAI(
  imageUrl: string,
  ocrText: string | null,
  useGpt4: boolean = false,
): Promise<ExtractedWineData> {
  // SSRF protection - validate image URL before sending to external API
  if (!isValidImageUrl(imageUrl)) {
    console.error(`Rejected invalid image URL for OpenAI extraction: ${imageUrl}`);
    throw new Error("Invalid image URL - must be HTTPS from trusted domain");
  }

  const model = useGpt4 ? "gpt-4o" : "gpt-4o-mini";

  const prompts = getPrompt('WINE_LABEL_EXTRACTION', ocrText);
  const systemPrompt = prompts.system;
  const userPrompt = prompts.user;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", content);
    throw new Error(`OpenAI returned invalid JSON: ${parseError.message}`);
  }

  // Validate and provide defaults for missing required fields
  const extractedData: ExtractedWineData = {
    producer: parsed.producer || "Unknown Producer",
    wine_name: parsed.wine_name || "Unknown Wine",
    year: parsed.year ?? null,
    country: parsed.country ?? null,
    region: parsed.region ?? null,
    varietals: Array.isArray(parsed.varietals) ? parsed.varietals : [],
    abv_percent: parsed.abv_percent ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.3,
    producer_website: parsed.producer_website ?? null,
    producer_address: parsed.producer_address ?? null,
    producer_city: parsed.producer_city ?? null,
    producer_postal_code: parsed.producer_postal_code ?? null,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
  };

  // Log warning if we had to use defaults
  if (!parsed.producer || !parsed.wine_name) {
    console.warn(
      `OpenAI returned incomplete data. Using defaults. Original response:`,
      JSON.stringify(parsed).substring(0, 200)
    );
  }

  // If confidence is very low or we're using defaults, mark it low
  if (!parsed.producer || !parsed.wine_name) {
    extractedData.confidence = Math.min(extractedData.confidence, 0.2);
  }

  // Handle year field - sometimes OpenAI returns a string instead of a number
  if (extractedData.year !== null && extractedData.year !== undefined) {
    if (typeof extractedData.year === "string") {
      // Try to extract a 4-digit year from the string
      const yearMatch = String(extractedData.year).match(/\b(19\d{2}|20[0-2]\d)\b/);
      if (yearMatch) {
        extractedData.year = parseInt(yearMatch[1]);
      } else {
        // If no valid year found in string, set to null
        console.log(
          `Could not parse year from string: "${extractedData.year}", setting to null`,
        );
        extractedData.year = null;
      }
    } else if (typeof extractedData.year === "number") {
      // Validate the year is reasonable (1900-2025)
      if (extractedData.year < 1900 || extractedData.year > 2025) {
        console.log(`Invalid year ${extractedData.year}, setting to null`);
        extractedData.year = null;
      }
    }
  }

  return extractedData;
}

// Upsert region
async function upsertRegion(name: string, country: string): Promise<string> {
  // First try to find existing region
  const { data: existing } = await supabase
    .from("regions")
    .select("id")
    .ilike("name", name)
    .ilike("country", country)
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Insert new region
  const { data: newRegion, error } = await supabase
    .from("regions")
    .insert({ name, country })
    .select("id")
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("regions")
        .select("id")
        .ilike("name", name)
        .ilike("country", country)
        .limit(1)
        .single();
      if (retry) return retry.id;
    }
    throw error;
  }

  return newRegion.id;
}

// Upsert producer with location details
async function upsertProducer(
  name: string,
  regionId: string | null = null,
  website: string | null = null,
  address: string | null = null,
  city: string | null = null,
  postalCode: string | null = null,
  latitude: number | null = null,
  longitude: number | null = null,
): Promise<string> {
  // First try to find existing producer
  const { data: existing } = await supabase
    .from("producers")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .single();

  if (existing) {
    // Update with new location details if we have them
    if (
      website ||
      address ||
      city ||
      postalCode ||
      latitude ||
      longitude ||
      regionId
    ) {
      await supabase
        .from("producers")
        .update({
          ...(website && { website }),
          ...(address && { address }),
          ...(city && { city }),
          ...(postalCode && { postal_code: postalCode }),
          ...(latitude && { latitude }),
          ...(longitude && { longitude }),
          ...(regionId && { region_id: regionId }),
        })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  // Insert new producer with all details
  const { data: newProducer, error } = await supabase
    .from("producers")
    .insert({
      name,
      website,
      address,
      city,
      postal_code: postalCode,
      latitude,
      longitude,
      region_id: regionId,
    })
    .select("id")
    .single();

  if (error) {
    // Handle unique constraint violation - another request may have created it
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("producers")
        .select("id")
        .ilike("name", name)
        .limit(1)
        .single();
      if (retry) return retry.id;
    }
    throw error;
  }

  return newProducer.id;
}

// Upsert wine
async function upsertWine(
  producerId: string,
  wineName: string,
  year: number | null,
): Promise<string> {
  // First try to find existing wine
  const { data: existing } = await supabase
    .from("wines")
    .select("id")
    .eq("producer_id", producerId)
    .ilike("name", wineName)
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Determine if this is truly NV based on wine name patterns
  const nvPatterns = [
    /\bNV\b/i,
    /non[- ]?vintage/i,
    /multi[- ]?vintage/i,
    /solera/i,
    /perpetual/i,
  ];
  const isLikelyNV =
    year === null && nvPatterns.some((pattern) => pattern.test(wineName));

  // Insert new wine
  const { data: newWine, error } = await supabase
    .from("wines")
    .insert({
      name: wineName,
      producer_id: producerId,
      is_nv: isLikelyNV, // Only mark as NV if name suggests it
    })
    .select("id")
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("wines")
        .select("id")
        .eq("producer_id", producerId)
        .ilike("name", wineName)
        .limit(1)
        .single();
      if (retry) return retry.id;
    }
    throw error;
  }

  return newWine.id;
}

// Upsert vintage
async function upsertVintage(
  wineId: string,
  year: number | null,
  abvPercent: number | null,
): Promise<string> {
  if (year) {
    // Try to find existing vintage with specific year
    const { data: existing } = await supabase
      .from("vintages")
      .select("id")
      .eq("wine_id", wineId)
      .eq("year", year)
      .limit(1)
      .single();

    if (existing) {
      // Update ABV if provided
      if (abvPercent !== null) {
        await supabase
          .from("vintages")
          .update({ abv: abvPercent })
          .eq("id", existing.id);
      }
      return existing.id;
    }
  } else {
    // For NV wines, check if there's already a null-year vintage
    const { data: existing } = await supabase
      .from("vintages")
      .select("id")
      .eq("wine_id", wineId)
      .is("year", null)
      .limit(1)
      .single();

    if (existing) {
      // Update ABV if provided
      if (abvPercent !== null) {
        await supabase
          .from("vintages")
          .update({ abv: abvPercent })
          .eq("id", existing.id);
      }
      return existing.id;
    }
  }

  // Insert new vintage
  const { data: newVintage, error } = await supabase
    .from("vintages")
    .insert({
      wine_id: wineId,
      year,
      abv: abvPercent,
    })
    .select("id")
    .single();

  if (error) throw error;
  return newVintage.id;
}

// Upsert varietals
async function upsertVarietals(
  vintageId: string,
  varietalNames: string[],
): Promise<void> {
  if (!varietalNames || varietalNames.length === 0) return;

  // First, delete existing varietals for this vintage
  await supabase.from("wine_varietals").delete().eq("vintage_id", vintageId);

  // Find or fuzzy match varietals
  const varietalIds: number[] = [];

  for (const name of varietalNames) {
    // Try exact match first
    let { data: varietal } = await supabase
      .from("grape_varietals")
      .select("id")
      .ilike("name", name)
      .limit(1)
      .single();

    // If no exact match, try fuzzy match with pg_trgm using direct SQL
    if (!varietal) {
      const { data: fuzzyMatch } = await supabase
        .from("grape_varietals")
        .select("id, name")
        .textSearch("name", name, {
          type: "plain",
          config: "english",
        })
        .limit(1)
        .single();

      if (fuzzyMatch) {
        varietal = { id: fuzzyMatch.id };
      }
    }

    // If still no match, create new varietal
    if (!varietal) {
      const { data: newVarietal } = await supabase
        .from("grape_varietals")
        .insert({ name })
        .select("id")
        .single();

      if (newVarietal) {
        varietal = newVarietal;
      }
    }

    if (varietal) {
      varietalIds.push(varietal.id);
    }
  }

  // Insert wine_varietals with equal percentages
  if (varietalIds.length > 0) {
    const percentPerVarietal = 100 / varietalIds.length;
    const varietalRecords = varietalIds.map((varietal_id) => ({
      vintage_id: vintageId,
      varietal_id,
      percent: Math.round(percentPerVarietal * 100) / 100,
    }));

    await supabase.from("wine_varietals").insert(varietalRecords);
  }
}

// Mark job as completed
async function markCompleted(
  jobId: string,
  processedData: ExtractedWineData,
): Promise<void> {
  await supabase
    .from("wines_added_queue")
    .update({
      status: "completed",
      processed_data: processedData,
      processed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// Handle job failure
async function handleFailure(job: WineQueueItem, error: Error): Promise<void> {
  const newRetryCount = job.retry_count + 1;
  const status = newRetryCount > 3 ? "failed" : "pending";

  await supabase
    .from("wines_added_queue")
    .update({
      status,
      retry_count: newRetryCount,
      error_message: error.message,
      processed_at: status === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", job.id);
}

// Process a single job
async function processJob(
  job: WineQueueItem,
): Promise<{ ok: boolean; reused?: boolean; matchMethod?: string }> {
  try {
    // Compute idempotency key if not present
    if (!job.idempotency_key) {
      const key = await computeIdempotencyKey(job.image_url, job.ocr_text);
      await supabase
        .from("wines_added_queue")
        .update({ idempotency_key: key })
        .eq("id", job.id);
      job.idempotency_key = key;
    }

    // Check for duplicate completed job
    if (job.idempotency_key) {
      const { data: duplicate } = await supabase
        .from("wines_added_queue")
        .select("processed_data")
        .eq("idempotency_key", job.idempotency_key)
        .eq("status", "completed")
        .neq("id", job.id)
        .limit(1)
        .single();

      if (duplicate?.processed_data) {
        await markCompleted(job.id, duplicate.processed_data);
        return { ok: true, reused: true };
      }
    }

    // =========================================================================
    // STEP 1: Attempt visual match first (image similarity via CLIP)
    // This is the most accurate match method for wine labels
    // =========================================================================
    const visualMatch = await attemptVisualMatch(job.image_url);

    if (visualMatch.matched && visualMatch.wineId) {
      console.log(`Visual match successful - skipping OpenAI extraction`);

      // Get or create vintage for matched wine
      let vintageId = visualMatch.vintageId;
      if (!vintageId) {
        const { data: vintageData } = await supabase.rpc(
          "get_or_create_vintage_for_wine",
          { p_wine_id: visualMatch.wineId, p_year: null }
        );
        vintageId = vintageData;
      }

      if (vintageId) {
        // Update scan with match info
        if (job.scan_id) {
          await supabase
            .from("scans")
            .update({
              matched_vintage_id: vintageId,
              confidence: visualMatch.similarity,
              match_method: "visual_embedding",
              vector_similarity: visualMatch.similarity,
            })
            .eq("id", job.scan_id);
        }

        // Create tasting record
        await createTastingFromVectorMatch(
          job,
          visualMatch.wineId,
          vintageId,
          visualMatch.similarity!
        );

        // Mark job as completed with match info
        await markCompleted(job.id, {
          producer: visualMatch.producerName || "Unknown",
          wine_name: visualMatch.wineName || "Unknown",
          year: null,
          country: null,
          region: null,
          varietals: [],
          abv_percent: null,
          confidence: visualMatch.similarity || 0.95,
        } as ExtractedWineData);

        console.log(`Successfully processed job ${job.id} via visual match`);
        return { ok: true, matchMethod: "visual_embedding" };
      }
    }

    // =========================================================================
    // STEP 2: Attempt text vector match with OCR text (before OpenAI)
    // This can save significant costs if we already have this wine
    // =========================================================================
    const vectorMatch = await attemptVectorMatch(job.ocr_text);

    if (vectorMatch.matched && vectorMatch.wineId) {
      console.log(`Text vector match successful - skipping OpenAI extraction`);

      // Get or create vintage for matched wine
      // We don't have year info from vector match, so we'll use null (NV)
      // The user can correct this if needed
      const { data: vintageData, error: vintageError } = await supabase.rpc(
        "get_or_create_vintage_for_wine",
        { p_wine_id: vectorMatch.wineId, p_year: null }
      );

      if (vintageError || !vintageData) {
        console.error("Failed to get/create vintage for vector match:", vintageError);
        // Fall through to OpenAI extraction
      } else {
        const vintageId = vintageData;

        // Update scan with match info
        if (job.scan_id) {
          await supabase
            .from("scans")
            .update({
              matched_vintage_id: vintageId,
              confidence: vectorMatch.similarity,
              match_method: "vector_identity",
              vector_similarity: vectorMatch.similarity,
            })
            .eq("id", job.scan_id);
        }

        // Create tasting record
        await createTastingFromVectorMatch(
          job,
          vectorMatch.wineId,
          vintageId,
          vectorMatch.similarity!
        );

        // Mark job as completed with match info
        await markCompleted(job.id, {
          producer: vectorMatch.producerName || "Unknown",
          wine_name: vectorMatch.wineName || "Unknown",
          year: null,
          country: null,
          region: null,
          varietals: [],
          abv_percent: null,
          confidence: vectorMatch.similarity || 0.9,
          match_method: "vector_identity",
        } as ExtractedWineData);

        console.log(`Successfully processed job ${job.id} via vector match`);
        return { ok: true, matchMethod: "vector_identity" };
      }
    }

    // =========================================================================
    // STEP 3: No vector match - proceed with OpenAI extraction
    // =========================================================================
    console.log("No vector match - proceeding with OpenAI extraction");

    // Extract wine data with OpenAI
    let result = await extractWithOpenAI(job.image_url, job.ocr_text);

    // If confidence is low, escalate to GPT-4
    if (result.confidence < 0.6) {
      console.log(`Low confidence (${result.confidence}), escalating to GPT-4`);
      result = await extractWithOpenAI(job.image_url, job.ocr_text, true);
    }

    // =========================================================================
    // STEP 4: Try vector match again with extracted data (more accurate)
    // =========================================================================
    const postExtractionMatch = await attemptVectorMatch(job.ocr_text, result);

    if (postExtractionMatch.matched && postExtractionMatch.wineId) {
      console.log(`Post-extraction vector match found - using existing wine`);

      // Get or create vintage for matched wine with the extracted year
      const { data: vintageData } = await supabase.rpc(
        "get_or_create_vintage_for_wine",
        { p_wine_id: postExtractionMatch.wineId, p_year: result.year }
      );

      if (vintageData) {
        const vintageId = vintageData;

        // Update vintage with ABV if we have it
        if (result.abv_percent) {
          await supabase
            .from("vintages")
            .update({ abv: result.abv_percent })
            .eq("id", vintageId);
        }

        // Update varietals if we have them
        if (result.varietals && result.varietals.length > 0) {
          await upsertVarietals(vintageId, result.varietals);
        }

        // Update scan with match info
        if (job.scan_id) {
          await supabase
            .from("scans")
            .update({
              matched_vintage_id: vintageId,
              confidence: postExtractionMatch.similarity,
              match_method: "vector_identity",
              vector_similarity: postExtractionMatch.similarity,
            })
            .eq("id", job.scan_id);
        }

        // Create tasting record
        await createTastingFromVectorMatch(
          job,
          postExtractionMatch.wineId,
          vintageId,
          postExtractionMatch.similarity!
        );

        // Mark job completed
        await markCompleted(job.id, {
          ...result,
          match_method: "vector_identity",
        } as ExtractedWineData);

        console.log(`Successfully processed job ${job.id} via post-extraction vector match`);
        return { ok: true, matchMethod: "vector_identity" };
      }
    }

    // =========================================================================
    // STEP 5: No vector match - create new wine records
    // =========================================================================
    console.log("No vector match after extraction - creating new wine records");

    // Enrich missing data with knowledge base
    const hasIncompleteData =
      !result.year || result.varietals.length === 0 || !result.region;
    if (hasIncompleteData) {
      console.log(
        `Enriching incomplete data for ${result.producer} - ${result.wine_name}`,
      );
      result = await enrichWineData(result);
      console.log(
        `Enrichment complete. Varietals: ${result.varietals.join(", ") || "none"}, Year: ${result.year || "null"}`,
      );
    }

    // Upsert region if we have both region and country
    let regionId: string | null = null;
    if (result.region && result.country) {
      regionId = await upsertRegion(result.region, result.country);
    }

    // Upsert producer with all location details
    const producerId = await upsertProducer(
      result.producer,
      regionId,
      result.producer_website,
      result.producer_address,
      result.producer_city,
      result.producer_postal_code,
      result.latitude,
      result.longitude,
    );

    // Upsert wine
    const wineId = await upsertWine(producerId, result.wine_name, result.year);

    // Upsert vintage
    const vintageId = await upsertVintage(
      wineId,
      result.year,
      result.abv_percent,
    );

    // Upsert varietals
    if (result.varietals && result.varietals.length > 0) {
      await upsertVarietals(vintageId, result.varietals);
    }

    // Get scan details to use its created_at for tasted_at
    let scanDate: string | null = null;
    if (job.scan_id) {
      const { data: scan } = await supabase
        .from("scans")
        .select("created_at")
        .eq("id", job.scan_id)
        .single();

      if (scan?.created_at) {
        // Use the scan's created_at date (in the format YYYY-MM-DD)
        scanDate = scan.created_at.split("T")[0];
      }

      // Update scan with matched vintage and mark as OpenAI processed
      await supabase
        .from("scans")
        .update({
          matched_vintage_id: vintageId,
          confidence: result.confidence,
          match_method: "openai_vision",
          contributed_to_embeddings: true,
        })
        .eq("id", job.scan_id);
    }

    // Use scan date if available, otherwise fall back to current date
    const tastedAtDate = scanDate || new Date().toISOString().split("T")[0];

    // Create a tasting record for the user with the wine image
    const { data: tastingData, error: tastingError } = await supabase.from("tastings").insert({
      user_id: job.user_id,
      vintage_id: vintageId,
      verdict: null, // User can set later
      notes: `Wine scanned on ${new Date(tastedAtDate).toLocaleDateString()}. ${result.varietals.length > 0 ? `Varietals: ${result.varietals.join(", ")}.` : ""} ${result.region ? `From ${result.region}${result.country ? `, ${result.country}` : ""}.` : ""}`,
      tasted_at: tastedAtDate, // Use the scan's date
      image_url: job.image_url, // Include the scanned wine image
    });

    if (tastingError) {
      console.error(
        `Warning: Failed to create tasting for user ${job.user_id}, vintage ${vintageId}`,
      );
      console.error("Tasting error details:", JSON.stringify(tastingError, null, 2));
      console.error("Tasting data attempted:", {
        user_id: job.user_id,
        vintage_id: vintageId,
        tasted_at: tastedAtDate,
        image_url: job.image_url,
      });
      console.error("Wine data has been saved. User can add tasting notes manually.");
      // Don't throw - the wine data is saved, user can add notes manually
    } else {
      console.log(`Created tasting for vintage ${vintageId}`);
    }

    // Queue wine for enrichment
    const { error: enrichmentQueueError } = await supabase
      .from("wines_enrichment_queue")
      .insert({
        vintage_id: vintageId,
        wine_id: wineId,
        user_id: job.user_id,
        producer_name: result.producer,
        wine_name: result.wine_name,
        year: result.year,
        region: result.region,
        country: result.country,
        existing_varietals: result.varietals || [],
        priority: 1, // Higher priority for new scans
      })
      .select();

    if (enrichmentQueueError && !enrichmentQueueError.message.includes("duplicate")) {
      console.error(`Failed to queue enrichment for vintage ${vintageId}:`, enrichmentQueueError);
      // Don't fail the job if enrichment queueing fails
    } else if (!enrichmentQueueError) {
      console.log(`Queued enrichment for vintage ${vintageId}`);
    }

    // =========================================================================
    // STEP 6: Queue new wine for embedding generation and store visual embedding
    // This builds our vector database for future matches
    // =========================================================================
    await queueEmbeddingGeneration(wineId, job.scan_id, 1);

    // Store visual embedding in Vector Bucket for future image matching
    await storeVisualEmbedding(
      job.image_url,
      wineId,
      vintageId,
      job.scan_id,
      result.producer,
      result.wine_name
    );

    // Mark job as completed
    await markCompleted(job.id, result);

    console.log(`Successfully processed job ${job.id} via OpenAI`);
    return { ok: true, matchMethod: "openai_vision" };
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    await handleFailure(job, error);
    return { ok: false };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("Origin");

  try {
    // Parse request body for optional limit parameter
    let limit = 5; // Default to 5 jobs per invocation
    try {
      const body = await req.json();
      if (body.limit && typeof body.limit === "number" && body.limit > 0) {
        limit = Math.min(body.limit, 20); // Cap at 20 for safety
      }
    } catch {
      // If no body or invalid JSON, use default limit
    }

    // Claim jobs atomically
    const { data: jobs, error: claimError } = await supabase.rpc(
      "claim_wines_added_queue_jobs",
      { p_limit: limit },
    );

    if (claimError) {
      console.error("Error claiming jobs:", claimError);
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // No jobs to process
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, total: 0 }),
        {
          status: 200,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Processing ${jobs.length} jobs`);

    // Process jobs in parallel
    const results = await Promise.allSettled(
      jobs.map((job: WineQueueItem) => processJob(job)),
    );

    // Count successes, failures, and match methods
    const processed = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    const failed = results.length - processed;

    // Track match methods for analytics
    const visualMatches = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok && r.value.matchMethod === "visual_embedding"
    ).length;
    const vectorMatches = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok && r.value.matchMethod === "vector_identity"
    ).length;
    const openaiMatches = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok && r.value.matchMethod === "openai_vision"
    ).length;

    const response = {
      processed,
      failed,
      total: jobs.length,
      visual_matches: visualMatches,
      vector_matches: vectorMatches,
      openai_matches: openaiMatches,
    };

    console.log(`Processed ${processed} jobs (${visualMatches} visual, ${vectorMatches} vector, ${openaiMatches} OpenAI), ${failed} failed`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in process-wine-queue:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
