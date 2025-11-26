import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.VINHO_SERVICE_ROLE_KEY || ""
);

interface VectorQueryResult {
  key: string;
  distance?: number;
  metadata?: Record<string, unknown>;
}

async function test() {
  console.log("Testing Vector Bucket...");

  // Test wine ID from the user's list
  const testWineId = "0eff7da0-cf7e-4356-9851-56dfe4cc44e7";
  const vectorKey = "wine_" + testWineId;

  console.log("Looking for vector key:", vectorKey);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = supabase.storage as any;

    console.log("Storage object keys:", Object.keys(storage));
    console.log("Has vectors?", !!storage.vectors);

    if (!storage.vectors) {
      console.log("Vectors API not available");
      return;
    }

    const bucket = storage.vectors.from("wine-labels");
    console.log("Bucket object keys:", Object.keys(bucket));

    const index = bucket.index("visual-embeddings");
    console.log("Index object:", index);
    console.log("Index methods:", Object.keys(index || {}));

    // Try to list what methods are available
    if (index) {
      for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(index))) {
        console.log("  Method:", key);
      }
    }

    // First, let's get the embedding from the database for testing
    const { data: embedRow, error: embedError } = await supabase
      .from("label_embeddings")
      .select("label_embedding")
      .eq("wine_id", testWineId)
      .eq("embedding_model", "jina-clip-v1")
      .single();

    if (embedError || !embedRow) {
      console.log("Could not get embedding from database:", embedError);
      return;
    }

    // Vector type comes back as a string like "[0.1,0.2,...]"
    let embedding: number[];
    if (typeof embedRow.label_embedding === "string") {
      // Parse the vector string - it looks like "[0.1,0.2,...]"
      embedding = JSON.parse(embedRow.label_embedding);
      console.log("Parsed embedding from string, length:", embedding.length);
    } else if (Array.isArray(embedRow.label_embedding)) {
      embedding = embedRow.label_embedding;
      console.log("Got embedding as array, length:", embedding.length);
    } else {
      console.log("Unknown embedding format:", typeof embedRow.label_embedding);
      return;
    }

    // Test getVectors to get vector by key
    const { data: getResult, error: getError } = await index.getVectors({
      keys: [vectorKey],
    });

    if (getError) {
      console.log("getVectors error:", getError);
    } else {
      console.log("getVectors result - vectors count:", getResult?.vectors?.length || 0);
      if (getResult?.vectors?.[0]) {
        const v = getResult.vectors[0];
        console.log("  Vector key:", v.key);
        console.log("  Has float32:", !!v.data?.float32);
        console.log("  Float32 length:", v.data?.float32?.length);
        console.log("  Metadata keys:", v.metadata ? Object.keys(v.metadata) : "none");
      }
    }

    // Now try to query vectors with this embedding
    const { data: searchResults, error: searchError } = await index.queryVectors({
      queryVector: { float32: embedding },
      topK: 10,
      returnDistance: true,
      returnMetadata: true,
    });

    if (searchError) {
      console.log("Search error:", searchError);
    } else {
      console.log("Search found", searchResults?.vectors?.length || 0, "results:");
      searchResults?.vectors?.slice(0, 5).forEach((v: VectorQueryResult) => {
        const similarity = 1 - (v.distance || 0);
        console.log("  -", v.key, "similarity:", similarity.toFixed(3), "metadata:", JSON.stringify(v.metadata || {}));
      });
    }
  } catch (e) {
    console.log("Exception:", e instanceof Error ? e.message : e);
    console.log("Stack:", e instanceof Error ? e.stack : "");
  }
}

test();
