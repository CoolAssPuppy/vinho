import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const VECTOR_BUCKET = "wine-labels";
const VECTOR_INDEX = "visual-embeddings";

/**
 * Create a Supabase client that works for both:
 * 1. Web clients using cookies
 * 2. iOS/mobile clients using Bearer token
 */
async function getAuthenticatedSupabase(request: NextRequest) {
  // Check for Bearer token first (mobile clients)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    return supabase;
  }

  // Fall back to cookie-based auth (web clients)
  return createServerSupabase();
}

/**
 * Create a service role client for vector operations
 * Vector bucket access requires elevated permissions
 */
function getServiceRoleSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.VINHO_SERVICE_ROLE_KEY!
  );
}

interface VectorQueryResult {
  key: string;
  distance?: number;
  metadata?: Record<string, unknown>;
}

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
  vectors: { from: (bucket: string) => VectorBucket };
}

interface SimilarWine {
  wine_id: string;
  wine_name: string;
  producer_name: string;
  similarity: number;
  image_url?: string;
  region?: string;
  country?: string;
  source_wine_id: string;
}

interface SourceWine {
  id: string;
  name: string;
  producer: string;
}

type RecommendationType = "personalized" | "your_favorites";

/**
 * GET /api/wines/similar-for-user
 *
 * Finds visually similar wines based on user's tastings.
 * Strategy:
 * 1. Try highly-rated wines (4-5 stars) for personalized recommendations
 * 2. Fallback to ALL user's wines for "Your Favorites" style recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const threshold = parseFloat(searchParams.get("threshold") || "0.60");

    const supabase = await getAuthenticatedSupabase(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    if (!user) {
      console.error("No user found in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[similar-for-user] User authenticated:", user.id);

    // Get ALL user's wines (not just highly-rated)
    const { data: allTastings, error: tastingsError } = await supabase
      .from("tastings")
      .select(`
        verdict,
        image_url,
        vintage:vintage_id (
          wine:wine_id (id, name, producer:producer_id (name))
        )
      `)
      .eq("user_id", user.id)
      .order("verdict", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (tastingsError) {
      console.error("Error fetching tastings:", tastingsError);
      return NextResponse.json(
        { error: "Failed to fetch user tastings" },
        { status: 500 }
      );
    }

    if (!allTastings || allTastings.length === 0) {
      return NextResponse.json({
        similar_wines: [],
        recommendation_type: "none",
        message: "No wines found in your collection",
      });
    }

    // Extract wine IDs and separate by rating
    const tastedWineIds = new Set<string>();
    const highRatedWines: SourceWine[] = [];
    const allWines: SourceWine[] = [];

    for (const tasting of allTastings) {
      const vintage = tasting.vintage as { wine: { id: string; name: string; producer: { name: string } } } | null;
      if (!vintage?.wine?.id) continue;

      const wineId = vintage.wine.id;
      if (tastedWineIds.has(wineId)) continue;

      tastedWineIds.add(wineId);

      const wineData: SourceWine = {
        id: wineId,
        name: vintage.wine.name,
        producer: vintage.wine.producer?.name || "Unknown",
      };

      allWines.push(wineData);

      if (tasting.verdict && tasting.verdict >= 4) {
        highRatedWines.push(wineData);
      }
    }

    // Determine which wines to use as source
    let sourceWines: SourceWine[];
    let recommendationType: RecommendationType;

    if (highRatedWines.length >= 2) {
      sourceWines = highRatedWines.slice(0, 5);
      recommendationType = "personalized";
    } else {
      // Fallback: use all wines for "Your Favorites" style
      sourceWines = allWines.slice(0, 5);
      recommendationType = "your_favorites";
    }

    if (sourceWines.length === 0) {
      return NextResponse.json({
        similar_wines: [],
        recommendation_type: "none",
        message: "No wine data available for recommendations",
      });
    }

    // Query vector bucket for similar wines
    // Service role is required for vector bucket access
    const serviceRoleKey = process.env.VINHO_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error("[similar-for-user] VINHO_SERVICE_ROLE_KEY not configured");
      return NextResponse.json(
        { error: "Recommendations service not configured" },
        { status: 503 }
      );
    }

    console.log("[similar-for-user] Using service role client for vectors");
    const vectorSupabase = getServiceRoleSupabase();

    const storage = vectorSupabase.storage as unknown as StorageWithVectors;

    if (!storage?.vectors) {
      console.error("[similar-for-user] Vectors API not available on storage client");
      return NextResponse.json(
        { error: "Vector storage not available" },
        { status: 500 }
      );
    }

    const index = storage.vectors.from(VECTOR_BUCKET).index(VECTOR_INDEX);
    console.log("[similar-for-user] Querying vectors for", sourceWines.length, "source wines");

    const candidateWines = new Map<string, SimilarWine>();

    for (const sourceWine of sourceWines) {
      const vectorKey = `wine_${sourceWine.id}`;
      console.log("[similar-for-user] Getting vector for key:", vectorKey);

      let vectorData, vectorError;
      try {
        const result = await index.getVector(vectorKey);
        vectorData = result.data;
        vectorError = result.error;
      } catch (err) {
        console.error("[similar-for-user] Vector fetch threw:", err);
        continue;
      }

      if (vectorError) {
        console.log("[similar-for-user] Vector error for", vectorKey, ":", vectorError);
        continue;
      }

      if (!vectorData?.data?.float32) {
        console.log("[similar-for-user] No float32 data for", vectorKey);
        continue;
      }

      console.log("[similar-for-user] Got vector for", vectorKey, "- dimensions:", vectorData.data.float32.length);

      const { data: searchResults, error: searchError } = await index.queryVectors({
        queryVector: { float32: vectorData.data.float32 },
        topK: limit + tastedWineIds.size + 5,
        returnDistance: true,
        returnMetadata: true,
      });

      if (searchError || !searchResults?.vectors) {
        continue;
      }

      for (const vector of searchResults.vectors) {
        const metadata = vector.metadata as Record<string, string> | undefined;
        const wineId = metadata?.wine_id;

        if (!wineId || tastedWineIds.has(wineId)) {
          continue;
        }

        const similarity = 1 - (vector.distance || 0);
        if (similarity < threshold) {
          continue;
        }

        const existing = candidateWines.get(wineId);
        if (!existing || similarity > existing.similarity) {
          candidateWines.set(wineId, {
            wine_id: wineId,
            wine_name: metadata?.wine_name || "Unknown Wine",
            producer_name: metadata?.producer_name || "Unknown Producer",
            similarity,
            image_url: metadata?.image_url,
            source_wine_id: sourceWine.id,
          });
        }
      }
    }

    if (candidateWines.size === 0) {
      return NextResponse.json({
        similar_wines: [],
        recommendation_type: recommendationType,
        message: "No visually similar wines found",
      });
    }

    // Sort by similarity and take top results
    const sortedWines = Array.from(candidateWines.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Enrich with database details
    const wineIds = sortedWines.map((w) => w.wine_id);
    const { data: wineDetails } = await supabase
      .from("wines")
      .select(`
        id,
        name,
        producer:producer_id (name, region:region_id (name, country))
      `)
      .in("id", wineIds);

    const detailsMap = new Map(
      (wineDetails || []).map((w) => [w.id, w])
    );

    const enrichedWines = sortedWines.map((wine) => {
      const details = detailsMap.get(wine.wine_id);
      const producer = details?.producer as { name: string; region?: { name: string; country: string } } | null;

      return {
        wine_id: wine.wine_id,
        wine_name: details?.name || wine.wine_name,
        producer_name: producer?.name || wine.producer_name,
        similarity: Math.round(wine.similarity * 100) / 100,
        image_url: wine.image_url,
        region: producer?.region?.name,
        country: producer?.region?.country,
        source_wine_id: wine.source_wine_id,
      };
    });

    return NextResponse.json({
      similar_wines: enrichedWines,
      count: enrichedWines.length,
      based_on_count: sourceWines.length,
      recommendation_type: recommendationType,
    });
  } catch (error) {
    console.error("[similar-for-user] Caught error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[similar-for-user] Error details:", { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      {
        error: "Failed to find similar wines",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
