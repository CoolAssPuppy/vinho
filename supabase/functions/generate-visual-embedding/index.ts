import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JINA_API_KEY = Deno.env.get("JINA_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Jina CLIP API configuration
const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-clip-v1";

// Vector Bucket configuration
const VECTOR_BUCKET = "wine-labels";
const VECTOR_INDEX = "visual-embeddings";

interface VisualEmbeddingRequest {
  image_url: string;
  wine_id: string;
  vintage_id?: string;
  scan_id?: string;
  producer_name?: string;
  wine_name?: string;
}

interface JinaEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    total_tokens: number;
  };
}

/**
 * Generate image embedding using Jina CLIP v1
 * Returns a 768-dimensional vector
 */
async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
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
    throw new Error(`Jina API error: ${response.status} - ${errorText}`);
  }

  const result: JinaEmbeddingResponse = await response.json();

  if (!result.data || result.data.length === 0) {
    throw new Error("No embedding returned from Jina API");
  }

  console.log(`Generated embedding with ${result.data[0].embedding.length} dimensions, used ${result.usage.total_tokens} tokens`);

  return result.data[0].embedding;
}

/**
 * Store visual embedding in Vector Bucket
 */
async function storeVisualEmbedding(
  key: string,
  embedding: number[],
  metadata: Record<string, unknown>
): Promise<void> {
  const index = supabase.storage.vectors
    .from(VECTOR_BUCKET)
    .index(VECTOR_INDEX);

  const { error } = await index.putVectors({
    vectors: [
      {
        key,
        data: { float32: embedding },
        metadata,
      },
    ],
  });

  if (error) {
    console.error("Failed to store vector:", error);
    throw new Error(`Failed to store vector: ${error.message}`);
  }

  console.log(`Stored visual embedding with key: ${key}`);
}

/**
 * Search for similar visual embeddings
 */
async function searchSimilarImages(
  embedding: number[],
  topK: number = 5,
  threshold: number = 0.85
): Promise<Array<{
  key: string;
  similarity: number;
  metadata: Record<string, unknown>;
}>> {
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
    throw new Error(`Vector search failed: ${error.message}`);
  }

  if (!data?.vectors) {
    return [];
  }

  // Convert distance to similarity and filter by threshold
  // For cosine distance: similarity = 1 - distance
  return data.vectors
    .map((v) => ({
      key: v.key,
      similarity: 1 - (v.distance || 0),
      metadata: v.metadata || {},
    }))
    .filter((v) => v.similarity >= threshold);
}

/**
 * Main handler - generates and stores visual embeddings
 */
Deno.serve(async (req: Request) => {
  try {
    const body: VisualEmbeddingRequest = await req.json();

    if (!body.image_url) {
      return new Response(
        JSON.stringify({ error: "image_url is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.wine_id) {
      return new Response(
        JSON.stringify({ error: "wine_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing visual embedding for wine ${body.wine_id}`);
    console.log(`Image URL: ${body.image_url}`);

    // Check if JINA_API_KEY is configured
    if (!JINA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "JINA_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate embedding
    const embedding = await generateImageEmbedding(body.image_url);

    // Create unique key for this embedding
    // Use scan_id if available (unique per scan), otherwise wine_id
    const vectorKey = body.scan_id
      ? `scan_${body.scan_id}`
      : `wine_${body.wine_id}`;

    // Prepare metadata
    const metadata: Record<string, unknown> = {
      wine_id: body.wine_id,
      image_url: body.image_url,
      created_at: new Date().toISOString(),
    };

    if (body.vintage_id) metadata.vintage_id = body.vintage_id;
    if (body.scan_id) metadata.scan_id = body.scan_id;
    if (body.producer_name) metadata.producer_name = body.producer_name;
    if (body.wine_name) metadata.wine_name = body.wine_name;

    // Store in Vector Bucket
    await storeVisualEmbedding(vectorKey, embedding, metadata);

    // Also update the label_embeddings table for backwards compatibility
    // (optional - can remove once fully migrated to Vector Buckets)
    const { error: dbError } = await supabase.from("label_embeddings").upsert(
      {
        wine_id: body.wine_id,
        vintage_id: body.vintage_id || null,
        source_scan_id: body.scan_id || null,
        source_image_url: body.image_url,
        label_embedding: JSON.stringify(embedding),
        embedding_model: "jina-clip-v1",
        embedding_version: 1,
      },
      {
        onConflict: "wine_id,embedding_model,embedding_version",
      }
    );

    if (dbError) {
      console.warn("Failed to store in label_embeddings table:", dbError);
      // Don't fail - Vector Bucket is the primary storage
    }

    return new Response(
      JSON.stringify({
        success: true,
        key: vectorKey,
        dimensions: embedding.length,
        wine_id: body.wine_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-visual-embedding:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
