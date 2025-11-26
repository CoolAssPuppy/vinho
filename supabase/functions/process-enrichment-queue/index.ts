import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.20.1/mod.ts";
import {
  enrichWineWithAI,
  storeGrapeVarietals,
  updateWineWithEnrichment,
  type WineData,
  type WineEnrichmentData
} from "../../shared/wine-enrichment.ts";
import {
  verifyInternalRequest,
  handleCorsPreFlight,
  getCorsHeaders,
} from "../../shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const VINHO_SERVICE_ROLE_KEY = Deno.env.get("VINHO_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, VINHO_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface EnrichmentJob {
  id: string;
  vintage_id: string;
  wine_id: string;
  user_id: string;
  producer_name: string;
  wine_name: string;
  year: number | null;
  region: string | null;
  country: string | null;
  existing_varietals: string[] | null;
}

// Mark job as completed
async function markCompleted(jobId: string, enrichmentData: WineEnrichmentData) {
  await supabase
    .from("wines_enrichment_queue")
    .update({
      status: "completed",
      enrichment_data: enrichmentData,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// Mark job as failed
async function markFailed(jobId: string, error: any) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  const { data: job } = await supabase
    .from("wines_enrichment_queue")
    .select("retry_count")
    .eq("id", jobId)
    .single();

  const retryCount = (job?.retry_count || 0) + 1;
  const status = retryCount >= 3 ? "failed" : "pending";

  await supabase
    .from("wines_enrichment_queue")
    .update({
      status,
      retry_count: retryCount,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// Process a single enrichment job
async function processEnrichmentJob(job: EnrichmentJob): Promise<{ ok: boolean }> {
  try {
    console.log(`Processing enrichment job ${job.id} for wine ${job.wine_name}`);

    // Prepare wine data for enrichment
    const wineData: WineData = {
      producer: job.producer_name,
      wine_name: job.wine_name,
      year: job.year,
      region: job.region,
      country: job.country,
      varietals: job.existing_varietals || [],
    };

    // Get enrichment data from AI
    const enrichmentData = await enrichWineWithAI(openai, wineData);

    if (!enrichmentData) {
      throw new Error("Failed to get enrichment data from AI");
    }

    // Get the current wine data
    const { data: wine, error: wineError } = await supabase
      .from("wines")
      .select("*")
      .eq("id", job.wine_id)
      .single();

    if (wineError || !wine) {
      throw new Error(`Wine not found: ${job.wine_id}`);
    }

    // Update wine with enriched data
    const updated = await updateWineWithEnrichment(
      supabase,
      job.wine_id,
      enrichmentData,
      wine
    );

    if (updated) {
      console.log(`Updated wine ${job.wine_id} with enrichment data`);
    }

    // Store grape varietals if provided
    if (enrichmentData.varietals && enrichmentData.varietals.length > 0) {
      await storeGrapeVarietals(supabase, job.vintage_id, enrichmentData.varietals);
      console.log(`Stored ${enrichmentData.varietals.length} varietals for vintage ${job.vintage_id}`);
    }

    // Mark job as completed
    await markCompleted(job.id, enrichmentData);

    console.log(`Successfully enriched wine ${job.wine_name}`);
    return { ok: true };
  } catch (error) {
    console.error(`Error processing enrichment job ${job.id}:`, error);
    await markFailed(job.id, error);
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
    // This endpoint is internal-only - must be called with service role key
    const authError = verifyInternalRequest(req);
    if (authError) return authError;

    // Parse request body for optional parameters
    let limit = 5; // Default to 5 jobs per invocation
    let action = "process"; // Default action

    try {
      const body = await req.json();
      if (body.limit && typeof body.limit === "number" && body.limit > 0) {
        limit = Math.min(body.limit, 10); // Cap at 10 for safety
      }
      if (body.action) {
        action = body.action;
      }
    } catch {
      // If no body or invalid JSON, use defaults
    }

    if (action === "process") {
      // Claim jobs atomically
      const { data: jobs, error: claimError } = await supabase.rpc(
        "claim_enrichment_jobs",
        { p_limit: limit },
      );

      if (claimError) {
        throw claimError;
      }

      if (!jobs || jobs.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "No pending enrichment jobs",
            processed: 0,
          }),
          { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
        );
      }

      console.log(`Claimed ${jobs.length} enrichment jobs`);

      // Process jobs
      let processed = 0;
      let failed = 0;

      for (const job of jobs) {
        const result = await processEnrichmentJob(job as EnrichmentJob);
        if (result.ok) {
          processed++;
        } else {
          failed++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed,
          failed,
          message: `Processed ${processed} enrichment jobs, ${failed} failed`,
        }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in process-enrichment-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
    );
  }
});