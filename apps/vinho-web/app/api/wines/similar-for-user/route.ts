import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

const VECTOR_BUCKET = "wine-labels";
const VECTOR_INDEX = "visual-embeddings";

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

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const storage = supabase.storage as unknown as StorageWithVectors;
    const index = storage.vectors.from(VECTOR_BUCKET).index(VECTOR_INDEX);

    const candidateWines = new Map<string, SimilarWine>();

    for (const sourceWine of sourceWines) {
      const vectorKey = `wine_${sourceWine.id}`;
      const { data: vectorData, error: vectorError } = await index.getVector(vectorKey);

      if (vectorError || !vectorData?.data?.float32) {
        continue;
      }

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
    console.error("Similar wines for user error:", error);
    return NextResponse.json(
      { error: "Failed to find similar wines" },
      { status: 500 }
    );
  }
}
