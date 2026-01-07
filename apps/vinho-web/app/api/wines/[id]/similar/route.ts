import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-clip-v1";
const VECTOR_BUCKET = "wine-labels";
const VECTOR_INDEX = "visual-embeddings";

// Vector Bucket types (not yet fully typed in SDK)
interface VectorIndex {
  getVector: (key: string) => Promise<{
    data: { data?: { float32?: number[] } } | null;
    error: Error | null;
  }>;
  queryVectors: (params: {
    queryVector: { float32: number[] };
    topK: number;
    returnDistance: boolean;
    returnMetadata: boolean;
  }) => Promise<{
    data: { vectors?: VectorQueryResult[] } | null;
    error: Error | null;
  }>;
}

interface VectorBucket {
  index: (name: string) => VectorIndex;
}

interface StorageWithVectors {
  vectors: {
    from: (bucket: string) => VectorBucket;
  };
}

interface SimilarWine {
  wine_id: string;
  wine_name: string;
  producer_name: string;
  similarity: number;
  image_url?: string;
  region?: string;
  country?: string;
}

interface VectorQueryResult {
  key: string;
  distance?: number;
  metadata?: Record<string, unknown>;
}

function parseIntSafe(value: string | null, defaultValue: number, min: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function parseFloatSafe(value: string | null, defaultValue: number, min: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * GET /api/wines/[id]/similar
 * Find visually similar wines based on label image embeddings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: wineId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseIntSafe(searchParams.get("limit"), 5, 1, 20);
    const threshold = parseFloatSafe(searchParams.get("threshold"), 0.7, 0, 1);

    if (!wineId) {
      return NextResponse.json(
        { error: "Wine ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Get current user (optional - allow public access for demo)
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // First, check if this wine has a visual embedding in Vector Bucket
    const vectorKey = `wine_${wineId}`;

    // Try to get the embedding from Vector Bucket
    // Using type assertion since Vector Buckets API is in alpha and not fully typed
    const storage = supabase.storage as unknown as StorageWithVectors;
    const index = storage.vectors.from(VECTOR_BUCKET).index(VECTOR_INDEX);

    // Get the vector for this wine
    const { data: vectorData, error: vectorError } = await index.getVector(vectorKey);

    if (vectorError || !vectorData) {
      // Wine doesn't have a visual embedding yet
      // Try to generate one from the wine's image
      const { data: wineData } = await supabase
        .from("wines")
        .select(`
          id,
          name,
          producer:producers(name),
          vintages(
            id,
            tastings(image_url)
          )
        `)
        .eq("id", wineId)
        .single();

      if (!wineData) {
        return NextResponse.json(
          { error: "Wine not found" },
          { status: 404 }
        );
      }

      // Try to find an image from tastings
      let imageUrl: string | null = null;
      for (const vintage of (wineData.vintages || [])) {
        for (const tasting of (vintage.tastings || [])) {
          if (tasting.image_url) {
            imageUrl = tasting.image_url;
            break;
          }
        }
        if (imageUrl) break;
      }

      if (!imageUrl) {
        return NextResponse.json({
          similar_wines: [],
          message: "No image available for this wine to find similar wines",
          wine_id: wineId,
        });
      }

      // Generate embedding on-the-fly using Jina CLIP
      const jinaApiKey = process.env.JINA_API_KEY;
      if (!jinaApiKey) {
        return NextResponse.json(
          { error: "Visual search not configured" },
          { status: 500 }
        );
      }

      const jinaResponse = await fetch(JINA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jinaApiKey}`,
        },
        body: JSON.stringify({
          model: JINA_MODEL,
          input: [{ image: imageUrl }],
        }),
      });

      if (!jinaResponse.ok) {
        return NextResponse.json(
          { error: "Failed to generate visual embedding" },
          { status: 500 }
        );
      }

      const jinaResult = await jinaResponse.json();
      const embedding = jinaResult.data?.[0]?.embedding;

      if (!embedding) {
        return NextResponse.json(
          { error: "No embedding returned from visual model" },
          { status: 500 }
        );
      }

      // Search for similar wines
      const { data: searchResults, error: searchError } = await index.queryVectors({
        queryVector: { float32: embedding },
        topK: limit + 1, // +1 to exclude self
        returnDistance: true,
        returnMetadata: true,
      });

      if (searchError) {
        return NextResponse.json(
          { error: "Visual search failed" },
          { status: 500 }
        );
      }

      return processSimilarResults(
        supabase,
        searchResults?.vectors || [],
        wineId,
        threshold,
        limit
      );
    }

    // Wine has an embedding - query for similar vectors
    const queryEmbedding = vectorData?.data?.float32;

    if (!queryEmbedding) {
      return NextResponse.json({
        similar_wines: [],
        message: "Wine embedding data is invalid",
        wine_id: wineId,
      });
    }

    const { data: searchResults, error: searchError } = await index.queryVectors({
      queryVector: { float32: queryEmbedding },
      topK: limit + 1, // +1 to exclude self
      returnDistance: true,
      returnMetadata: true,
    });

    if (searchError) {
      return NextResponse.json(
        { error: "Visual search failed" },
        { status: 500 }
      );
    }

    return processSimilarResults(
      supabase,
      searchResults?.vectors || [],
      wineId,
      threshold,
      limit
    );
  } catch {
    return NextResponse.json(
      {
        error: "Failed to find similar wines",
        details: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Process vector search results and return enriched similar wines
 */
async function processSimilarResults(
  supabase: ReturnType<typeof createServerSupabase> extends Promise<infer T> ? T : never,
  vectors: VectorQueryResult[],
  excludeWineId: string,
  threshold: number,
  limit: number
): Promise<NextResponse> {
  // Convert distance to similarity and filter
  const matches = vectors
    .map((v) => ({
      key: v.key,
      similarity: 1 - (v.distance || 0),
      metadata: v.metadata || {},
    }))
    .filter((v) => {
      // Exclude the source wine itself
      const metadataWineId = (v.metadata as Record<string, string>).wine_id;
      return metadataWineId !== excludeWineId && v.similarity >= threshold;
    })
    .slice(0, limit);

  if (matches.length === 0) {
    return NextResponse.json({
      similar_wines: [],
      message: "No visually similar wines found above threshold",
      wine_id: excludeWineId,
      threshold,
    });
  }

  // Get wine details for each match
  const wineIds = matches
    .map((m) => (m.metadata as Record<string, string>).wine_id)
    .filter(Boolean);

  const { data: wineDetails } = await supabase
    .from("wines")
    .select(`
      id,
      name,
      producer:producers(name, region:regions(name, country))
    `)
    .in("id", wineIds);

  // Map wine details to matches
  const wineDetailsMap = new Map(
    (wineDetails || []).map((w) => [w.id, w])
  );

  const similarWines: SimilarWine[] = matches.map((match) => {
    const metadata = match.metadata as Record<string, string>;
    const wineDetail = wineDetailsMap.get(metadata.wine_id);

    return {
      wine_id: metadata.wine_id,
      wine_name: wineDetail?.name || metadata.wine_name || "Unknown Wine",
      producer_name:
        (wineDetail?.producer as { name: string })?.name ||
        metadata.producer_name ||
        "Unknown Producer",
      similarity: Math.round(match.similarity * 1000) / 1000,
      image_url: metadata.image_url,
      region: (wineDetail?.producer as { region?: { name: string; country: string } })?.region?.name,
      country: (wineDetail?.producer as { region?: { name: string; country: string } })?.region?.country,
    };
  });

  return NextResponse.json({
    similar_wines: similarWines,
    wine_id: excludeWineId,
    count: similarWines.length,
    threshold,
  });
}
