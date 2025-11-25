import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Use Supabase's built-in embedding model (gte-small, 384 dimensions)
const embeddingModel = new Supabase.ai.Session("gte-small");

interface EmbeddingJob {
  id: string;
  job_type: "wine_identity" | "label_visual";
  wine_id: string;
  vintage_id: string | null;
  scan_id: string | null;
  input_text: string | null;
  input_image_url: string | null;
  retry_count: number;
}

/**
 * Generate text embedding using Supabase's built-in gte-small model
 * Returns a 384-dimensional vector
 */
async function generateTextEmbedding(text: string): Promise<number[]> {
  const output = await embeddingModel.run(text, {
    mean_pool: true,
    normalize: true,
  });

  // Handle different possible output formats from Supabase AI
  if (output === null || output === undefined) {
    throw new Error("Embedding model returned null or undefined");
  }

  // If output is directly iterable (Float32Array or Array)
  if (ArrayBuffer.isView(output) || Array.isArray(output)) {
    return Array.from(output as ArrayLike<number>);
  }

  // If output has a data property
  if (typeof output === "object" && "data" in output && output.data) {
    return Array.from(output.data as ArrayLike<number>);
  }

  // Log the actual output for debugging
  console.error("Unexpected embedding output format:", typeof output, JSON.stringify(output).substring(0, 200));
  throw new Error(`Unexpected embedding output format: ${typeof output}`);
}

/**
 * Calculate data completeness score based on identity text richness
 * Format: "Producer | Wine Name | Region, Country | Varietals"
 */
function calculateCompleteness(identityText: string): number {
  const parts = identityText.split(" | ");
  let score = 0;

  // Producer (required, but check it's not "Unknown Producer")
  if (parts[0] && parts[0] !== "Unknown Producer") {
    score += 0.25;
  }

  // Wine name (required)
  if (parts[1] && parts[1].length > 0) {
    score += 0.25;
  }

  // Region/Country (optional but valuable)
  if (parts[2] && parts[2].length > 0) {
    score += 0.25;
  }

  // Varietals (optional but valuable)
  if (parts[3] && parts[3].length > 0) {
    score += 0.25;
  }

  return Math.min(score, 1.0);
}

/**
 * Process a wine identity embedding job
 */
async function processIdentityJob(job: EmbeddingJob): Promise<void> {
  if (!job.input_text) {
    throw new Error("No input text provided for identity embedding");
  }

  console.log(`Generating identity embedding for wine ${job.wine_id}`);
  console.log(`Identity text: ${job.input_text}`);

  // Generate embedding
  const embedding = await generateTextEmbedding(job.input_text);

  // Calculate data completeness score
  const completeness = calculateCompleteness(job.input_text);

  // TODO: Implement Vector Buckets here when available for cost-effective storage
  // For now, store directly in PostgreSQL via pgvector
  const { error } = await supabase.from("wine_embeddings").upsert(
    {
      wine_id: job.wine_id,
      identity_embedding: JSON.stringify(embedding),
      identity_text: job.input_text,
      embedding_model: "gte-small",
      embedding_version: 1,
      data_completeness_score: completeness,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "wine_id,embedding_model,embedding_version",
    }
  );

  if (error) {
    console.error(`Failed to store embedding for wine ${job.wine_id}:`, error);
    throw error;
  }

  // Mark wine as vectorized
  const { error: updateError } = await supabase
    .from("wines")
    .update({ is_vectorized: true })
    .eq("id", job.wine_id);

  if (updateError) {
    console.error(`Failed to mark wine ${job.wine_id} as vectorized:`, updateError);
    // Don't throw - embedding was saved successfully
  }

  console.log(`Successfully generated embedding for wine ${job.wine_id} (completeness: ${completeness})`);
}

/**
 * Process a label visual embedding job (future CLIP integration)
 */
async function processLabelJob(job: EmbeddingJob): Promise<void> {
  // TODO: Implement CLIP model integration for true visual embeddings
  // For now, we skip label embeddings until vision model is integrated
  // This can be done via:
  // 1. External CLIP API (Replicate, HuggingFace)
  // 2. When Supabase adds vision model support
  // 3. Self-hosted CLIP endpoint

  if (!job.input_image_url) {
    throw new Error("No input image URL provided for label embedding");
  }

  console.log(`Label embedding generation pending vision model integration: ${job.id}`);
  console.log(`Image URL: ${job.input_image_url}`);

  // For now, mark as completed but don't generate embedding
  // The system will fall back to identity matching
}

/**
 * Mark a job as completed
 */
async function markJobCompleted(jobId: string): Promise<void> {
  const { error } = await supabase
    .from("embedding_jobs_queue")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error(`Failed to mark job ${jobId} as completed:`, error);
  }
}

/**
 * Mark a job as failed
 */
async function markJobFailed(
  jobId: string,
  errorMessage: string,
  retryCount: number
): Promise<void> {
  const newStatus = retryCount >= 2 ? "failed" : "pending"; // Will retry if < 3 attempts

  const { error } = await supabase
    .from("embedding_jobs_queue")
    .update({
      status: newStatus,
      error_message: errorMessage,
      retry_count: retryCount + 1,
      processed_at: newStatus === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", jobId);

  if (error) {
    console.error(`Failed to mark job ${jobId} as failed:`, error);
  }
}

/**
 * Main handler - processes embedding jobs from the queue
 */
Deno.serve(async (req: Request) => {
  try {
    // Parse request body for parameters
    let jobType = "wine_identity";
    let limit = 10;

    try {
      const body = await req.json();
      if (body.job_type && typeof body.job_type === "string") {
        jobType = body.job_type;
      }
      if (body.limit && typeof body.limit === "number" && body.limit > 0) {
        limit = Math.min(body.limit, 50); // Cap at 50 for safety
      }
    } catch {
      // If no body or invalid JSON, use defaults
    }

    console.log(`Processing up to ${limit} ${jobType} jobs`);

    // Claim jobs atomically using the stored function
    const { data: jobs, error: claimError } = await supabase.rpc(
      "claim_embedding_jobs",
      {
        p_job_type: jobType,
        p_limit: limit,
      }
    );

    if (claimError) {
      console.error("Error claiming jobs:", claimError);
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log("No jobs to process");
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, total: 0, message: "No jobs to process" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Claimed ${jobs.length} jobs for processing`);

    let processed = 0;
    let failed = 0;

    // Process jobs sequentially to avoid rate limits
    for (const job of jobs as EmbeddingJob[]) {
      try {
        if (job.job_type === "wine_identity") {
          await processIdentityJob(job);
        } else if (job.job_type === "label_visual") {
          await processLabelJob(job);
        } else {
          throw new Error(`Unknown job type: ${job.job_type}`);
        }

        await markJobCompleted(job.id);
        processed++;
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        await markJobFailed(job.id, error.message, job.retry_count);
        failed++;
      }
    }

    const response = {
      processed,
      failed,
      total: jobs.length,
      job_type: jobType,
    };

    console.log(`Completed: ${processed} processed, ${failed} failed out of ${jobs.length} total`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in generate-embeddings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
