/**
 * Visual Embeddings Backfill Script
 * Run with: npx tsx scripts/backfill-visual-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const JINA_API_KEY = process.env.JINA_API_KEY!;

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-clip-v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface WineWithImage {
  wine_id: string;
  wine_name: string;
  producer_name: string;
  image_url: string;
  vintage_id: string;
}

async function generateImageEmbedding(imageUrl: string): Promise<number[] | null> {
  try {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: [{ image: imageUrl }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jina API error: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();

    if (!result.data || result.data.length === 0) {
      console.error("No embedding returned from Jina API");
      return null;
    }

    return result.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}

async function getWinesNeedingEmbeddings(offset: number, limit: number): Promise<WineWithImage[]> {
  const { data, error } = await supabase.rpc("get_wines_for_visual_embedding", {
    p_offset: offset,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching wines:", error);
    return [];
  }

  return data || [];
}

async function storeEmbedding(wine: WineWithImage, embedding: number[]): Promise<boolean> {
  // Store in label_embeddings table using SECURITY DEFINER function
  const { error } = await supabase.rpc("insert_label_embedding", {
    p_wine_id: wine.wine_id,
    p_vintage_id: wine.vintage_id,
    p_source_image_url: wine.image_url,
    p_label_embedding: JSON.stringify(embedding),
    p_embedding_model: "jina-clip-v1",
    p_embedding_version: 1,
  });

  if (error) {
    console.error(`Failed to store embedding for ${wine.wine_name}:`, error);
    return false;
  }

  return true;
}

async function main() {
  console.log("Visual Embeddings Backfill");
  console.log("==========================\n");

  if (!JINA_API_KEY) {
    console.error("Error: JINA_API_KEY not set");
    console.log("Add JINA_API_KEY to your .env.local file");
    process.exit(1);
  }

  let processed = 0;
  let failed = 0;
  let offset = 0;
  const batchSize = 10;
  const startTime = Date.now();

  console.log(`Starting backfill at ${new Date().toISOString()}`);
  console.log(`Batch size: ${batchSize}\n`);

  while (true) {
    const wines = await getWinesNeedingEmbeddings(offset, batchSize);

    if (wines.length === 0) {
      console.log("\nNo more wines to process.");
      break;
    }

    console.log(`\nProcessing batch ${Math.floor(offset / batchSize) + 1} (${wines.length} wines)...`);

    for (const wine of wines) {
      process.stdout.write(`  ${wine.producer_name} - ${wine.wine_name}... `);

      const embedding = await generateImageEmbedding(wine.image_url);

      if (!embedding) {
        console.log("FAILED (embedding)");
        failed++;
        continue;
      }

      const stored = await storeEmbedding(wine, embedding);

      if (stored) {
        console.log("OK");
        processed++;
      } else {
        console.log("FAILED (storage)");
        failed++;
      }

      // Small delay to be nice to Jina API
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    offset += wines.length;

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    console.log(`  Progress: ${processed} processed, ${failed} failed, ${rate.toFixed(1)} wines/sec`);

    // Delay between batches
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log("\n==========================");
  console.log("Backfill Complete!");
  console.log(`  Total processed: ${processed}`);
  console.log(`  Total failed: ${failed}`);
  console.log(`  Time: ${totalTime.toFixed(1)} seconds`);
  console.log(`  Rate: ${(processed / totalTime).toFixed(2)} wines/sec`);
}

main().catch(console.error);
