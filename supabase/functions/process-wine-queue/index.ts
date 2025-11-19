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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
): Promise<{ ok: boolean; reused?: boolean }> {
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

    // Extract wine data with OpenAI
    let result = await extractWithOpenAI(job.image_url, job.ocr_text);

    // If confidence is low, escalate to GPT-4
    if (result.confidence < 0.6) {
      console.log(`Low confidence (${result.confidence}), escalating to GPT-4`);
      result = await extractWithOpenAI(job.image_url, job.ocr_text, true);
    }

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

      // Update scan with matched vintage
      await supabase
        .from("scans")
        .update({
          matched_vintage_id: vintageId,
          confidence: result.confidence,
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
        `⚠️ WARNING: Failed to create tasting for user ${job.user_id}, vintage ${vintageId}`,
      );
      console.error("Tasting error details:", JSON.stringify(tastingError, null, 2));
      console.error("Tasting data attempted:", {
        user_id: job.user_id,
        vintage_id: vintageId,
        tasted_at: tastedAtDate,
        image_url: job.image_url,
      });
      console.error("⚠️ Wine data has been saved. User can add tasting notes manually.");
      // Don't throw - the wine data is saved, user can add notes manually
    } else {
      console.log(`✅ Created tasting for vintage ${vintageId}`);
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

    // Mark job as completed
    await markCompleted(job.id, result);

    console.log(`Successfully processed job ${job.id}`);
    return { ok: true };
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    await handleFailure(job, error);
    return { ok: false };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
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
        headers: { "Content-Type": "application/json" },
      });
    }

    // No jobs to process
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, total: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Processing ${jobs.length} jobs`);

    // Process jobs in parallel
    const results = await Promise.allSettled(
      jobs.map((job: WineQueueItem) => processJob(job)),
    );

    // Count successes and failures
    const processed = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    const failed = results.length - processed;

    const response = {
      processed,
      failed,
      total: jobs.length,
    };

    console.log(`Processed ${processed} jobs, ${failed} failed`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in process-wine-queue:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
