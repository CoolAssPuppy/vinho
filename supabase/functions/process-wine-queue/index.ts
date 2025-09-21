import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "https://deno.land/x/openai@v4.20.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface WineQueueItem {
  id: string;
  user_id: string;
  image_url: string;
  ocr_text: string | null;
  scan_id: string | null;
  retry_count: number;
}

interface ParsedWineData {
  winery_name: string;
  wine_name: string;
  varietal: string | null;
  year: number | null;
  region: string | null;
  country: string | null;
  confidence: number;
}

async function parseWineLabel(
  imageUrl: string,
  ocrText: string | null,
): Promise<ParsedWineData> {
  try {
    // Use OpenAI's gpt-4o-mini model for cost-effectiveness
    const prompt = `Analyze this wine label information and extract structured data.
${ocrText ? `OCR Text from label: "${ocrText}"` : ""}

Extract and return ONLY a JSON object with these fields:
- winery_name: The producer/winery name
- wine_name: The specific wine name/cuvée
- varietal: The grape variety (null if not specified)
- year: The vintage year as a number (null if NV or not specified)
- region: The wine region (null if not specified)
- country: The country of origin (null if not specified)
- confidence: Your confidence level from 0-1

If you cannot determine a field with reasonable confidence, set it to null.
Return ONLY valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a wine expert that extracts structured data from wine labels. Return only valid JSON.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    // Parse the JSON response
    const parsed = JSON.parse(content) as ParsedWineData;
    return parsed;
  } catch (error) {
    console.error("Error parsing wine label:", error);
    throw error;
  }
}

async function findOrCreateProducer(data: ParsedWineData, userId: string) {
  // First try to find existing producer
  const { data: existingProducer } = await supabase
    .from("producers")
    .select("*")
    .ilike("name", `%${data.winery_name}%`)
    .limit(1)
    .single();

  if (existingProducer) {
    return existingProducer.id;
  }

  // Create new producer
  const { data: newProducer, error } = await supabase
    .from("producers")
    .insert({
      name: data.winery_name,
      website: null,
      region_id: null, // Could be enhanced to lookup region
    })
    .select()
    .single();

  if (error) throw error;
  return newProducer.id;
}

async function findOrCreateWine(data: ParsedWineData, producerId: string) {
  // Try to find existing wine
  const { data: existingWine } = await supabase
    .from("wines")
    .select("*")
    .eq("producer_id", producerId)
    .ilike("name", `%${data.wine_name}%`)
    .limit(1)
    .single();

  if (existingWine) {
    return existingWine.id;
  }

  // Create new wine
  const { data: newWine, error } = await supabase
    .from("wines")
    .insert({
      name: data.wine_name,
      producer_id: producerId,
      is_nv: data.year === null,
    })
    .select()
    .single();

  if (error) throw error;
  return newWine.id;
}

async function findOrCreateVintage(data: ParsedWineData, wineId: string) {
  if (data.year) {
    // Try to find existing vintage
    const { data: existingVintage } = await supabase
      .from("vintages")
      .select("*")
      .eq("wine_id", wineId)
      .eq("year", data.year)
      .limit(1)
      .single();

    if (existingVintage) {
      return existingVintage.id;
    }
  }

  // Create new vintage
  const { data: newVintage, error } = await supabase
    .from("vintages")
    .insert({
      wine_id: wineId,
      year: data.year,
      abv: null,
      climate_zone_id: null,
      soil_type_id: null,
      vineyard_id: null,
    })
    .select()
    .single();

  if (error) throw error;
  return newVintage.id;
}

async function processQueueItem(item: WineQueueItem) {
  try {
    // Update status to processing
    await supabase
      .from("wines_added")
      .update({
        status: "processing",
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    // Parse the wine label with OpenAI
    const parsedData = await parseWineLabel(item.image_url, item.ocr_text);

    // Find or create producer
    const producerId = await findOrCreateProducer(parsedData, item.user_id);

    // Find or create wine
    const wineId = await findOrCreateWine(parsedData, producerId);

    // Find or create vintage
    const vintageId = await findOrCreateVintage(parsedData, wineId);

    // Update scan if linked
    if (item.scan_id) {
      await supabase
        .from("scans")
        .update({
          matched_vintage_id: vintageId,
          confidence: parsedData.confidence,
        })
        .eq("id", item.scan_id);
    }

    // Mark as completed
    await supabase
      .from("wines_added")
      .update({
        status: "completed",
        processed_data: parsedData,
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    console.log(`Successfully processed wine ${item.id}`);
    return { success: true, vintageId };
  } catch (error) {
    console.error(`Error processing wine ${item.id}:`, error);

    // Increment retry count or mark as failed
    const newRetryCount = item.retry_count + 1;
    const status = newRetryCount > 3 ? "failed" : "pending";

    await supabase
      .from("wines_added")
      .update({
        status,
        retry_count: newRetryCount,
        error_message: error.message,
      })
      .eq("id", item.id);

    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Get the next pending item from the queue
    const { data: queueItems, error: fetchError } = await supabase
      .from("wines_added")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5); // Process up to 5 items per invocation

    if (fetchError) {
      console.error("Error fetching queue items:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process items in parallel
    const results = await Promise.allSettled(
      queueItems.map((item) => processQueueItem(item)),
    );

    const processed = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success),
    ).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${processed} items successfully, ${failed} failed`,
        processed,
        failed,
        total: queueItems.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
      },
    );
  } catch (error) {
    console.error("Error in process-wine-queue:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
