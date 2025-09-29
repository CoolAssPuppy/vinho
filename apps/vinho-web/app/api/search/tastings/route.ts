import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/embeddings";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

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
        console.error("Vector search error:", vectorError);
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
    } catch (embeddingError) {
      console.error("Embedding generation failed:", embeddingError);
      // Fall back to empty results if embedding fails
      return NextResponse.json({ results: [], method: "none" });
    }
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
