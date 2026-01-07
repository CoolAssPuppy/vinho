import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/embeddings";

function parseIntSafe(value: string | null, defaultValue: number, min: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseIntSafe(searchParams.get("limit"), 10, 1, 50);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // First try text search (faster and doesn't cost API calls)
    const { data: textResults, error: textError } = await supabase.rpc(
      "search_tastings_text",
      {
        query,
        match_count: limit,
        user_id_filter: user.id,
      },
    );

    if (!textError && textResults && textResults.length > 0) {
      return NextResponse.json({ results: textResults, method: "text" });
    }

    // If text search yields no results, try vector search
    try {
      const embedding = await generateEmbedding(query);

      const { data: vectorResults, error: vectorError } = await supabase.rpc(
        "search_tastings_vector",
        {
          query_embedding: embedding as unknown as string, // PostgreSQL vector type
          match_count: limit,
          user_id_filter: user.id,
        },
      );

      if (vectorError) {
        return NextResponse.json({ results: [], method: "none" });
      }

      // Filter results by similarity threshold
      interface VectorResult {
        similarity: number;
        [key: string]: unknown;
      }
      const filteredResults =
        vectorResults?.filter((r: VectorResult) => r.similarity > 0.7) || [];

      return NextResponse.json({
        results: filteredResults,
        method: "vector",
      });
    } catch {
      // Fall back to empty results if embedding fails
      return NextResponse.json({ results: [], method: "none" });
    }
  } catch {
    return NextResponse.json(
      {
        error: "Search failed",
        details: "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}
