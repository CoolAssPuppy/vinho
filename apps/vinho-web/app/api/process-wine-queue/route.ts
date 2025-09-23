import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import OpenAI from "openai";
import {
  downloadVivinoImage,
  ensureWineImagesBucket,
} from "@/app/lib/image-storage";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for processing

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WineEnrichmentData {
  wine_type?: string; // red, white, rosé, sparkling, fortified, dessert
  color?: string;
  style?: string;
  food_pairings?: string[];
  serving_temperature?: string;
  tasting_notes?: string;
}

interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

async function enrichWineWithAI(
  producerName: string,
  wineName: string,
  vintageYear?: number | null,
  regionalStyle?: string,
): Promise<WineEnrichmentData | null> {
  try {
    const prompt = `Given this wine information:
Wine: ${wineName}
Producer: ${producerName}
${vintageYear ? `Vintage: ${vintageYear}` : "Non-vintage wine"}
${regionalStyle ? `Regional Style: ${regionalStyle}` : ""}

Please provide the following information in JSON format:
1. wine_type: One of "red", "white", "rosé", "sparkling", "fortified", or "dessert"
2. color: Specific color description (e.g., "deep ruby", "pale gold", "light pink")
3. style: Wine style classification (e.g., "dry", "semi-dry", "sweet", "brut", "demi-sec")
4. food_pairings: Array of 4-6 specific food pairing suggestions
5. serving_temperature: Recommended serving temperature range (e.g., "16-18°C", "8-10°C")
6. tasting_notes: Brief tasting note (50-100 words) describing typical characteristics

Return ONLY valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a wine expert helping to enrich wine data. Provide accurate information based on typical characteristics of the wine. If you're not certain about specific details, provide reasonable estimates based on the wine type and region.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    // Parse JSON response
    const enrichedData = JSON.parse(content) as WineEnrichmentData;
    return enrichedData;
  } catch (error) {
    console.error(`Failed to enrich wine ${wineName}:`, error);
    return null;
  }
}

async function processWineFromQueue(
  wineEntry: any,
  supabase: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { id, image_url, processed_data } = wineEntry;

    // Extract data from processed_data
    const {
      producer_name,
      wine_name,
      vintage_year,
      regional_style,
      vivino_image_url,
      local_image_url,
    } = processed_data || {};

    if (!producer_name || !wine_name) {
      return { success: false, error: "Missing wine or producer name" };
    }

    // Step 1: Download and store image locally if it's still a Vivino URL
    let finalImageUrl = local_image_url || image_url;

    if (image_url && image_url.includes("vivino") && !local_image_url) {
      // Ensure bucket exists
      const bucketReady = await ensureWineImagesBucket();
      if (bucketReady) {
        try {
          const imageResult = await downloadVivinoImage(
            image_url,
            producer_name,
            wine_name,
            vintage_year,
          );

          if (imageResult.success && imageResult.localUrl) {
            finalImageUrl = imageResult.localUrl;
          }
        } catch (error) {
          console.warn(`Failed to download image for ${wine_name}:`, error);
        }
      }
    }

    // Step 2: Get wine enrichment data from OpenAI
    const enrichmentData = await enrichWineWithAI(
      producer_name,
      wine_name,
      vintage_year,
      regional_style,
    );

    if (!enrichmentData) {
      return { success: false, error: "Failed to get enrichment data from AI" };
    }

    // Step 3: Find the wine record to update
    const { data: wines, error: wineError } = await supabase
      .from("wines")
      .select(
        `
        id,
        name,
        producer:producers!inner(
          id,
          name
        )
      `,
      )
      .eq("name", wine_name)
      .eq("producers.name", producer_name);

    if (wineError) {
      return {
        success: false,
        error: `Failed to find wine: ${wineError.message}`,
      };
    }

    if (!wines || wines.length === 0) {
      return { success: false, error: "Wine not found in database" };
    }

    // Use the first matching wine (there might be multiple vintages)
    const wine = wines[0];

    // Step 4: Update wine with enriched data
    const updateData: any = {};

    if (enrichmentData.wine_type)
      updateData.wine_type = enrichmentData.wine_type;
    if (enrichmentData.color) updateData.color = enrichmentData.color;
    if (enrichmentData.style) updateData.style = enrichmentData.style;
    if (enrichmentData.food_pairings)
      updateData.food_pairings = enrichmentData.food_pairings;
    if (enrichmentData.serving_temperature)
      updateData.serving_temperature = enrichmentData.serving_temperature;
    if (enrichmentData.tasting_notes)
      updateData.tasting_notes = enrichmentData.tasting_notes;
    if (finalImageUrl) updateData.image_url = finalImageUrl;

    const { error: updateError } = await supabase
      .from("wines")
      .update(updateData)
      .eq("id", wine.id);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update wine: ${updateError.message}`,
      };
    }

    // Step 5: Mark as completed in wines_added
    await supabase
      .from("wines_added")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        processed_data: {
          ...processed_data,
          enrichment_data: enrichmentData,
          final_image_url: finalImageUrl,
          processing_completed_at: new Date().toISOString(),
        },
      })
      .eq("id", id);

    return { success: true };
  } catch (error) {
    console.error("Error processing wine from queue:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    // Get pending wine entries from the queue
    const { data: pendingWines, error: fetchError } = await supabase
      .from("wines_added")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10); // Process 10 at a time to avoid timeout

    if (fetchError) {
      console.error("Error fetching pending wines:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch pending wines" },
        { status: 500 },
      );
    }

    if (!pendingWines || pendingWines.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        message: "No pending wines to process",
      });
    }

    // Process each wine entry
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const wineEntry of pendingWines) {
      // Mark as working
      await supabase
        .from("wines_added")
        .update({ status: "working" })
        .eq("id", wineEntry.id);

      const result = await processWineFromQueue(wineEntry, supabase);

      if (result.success) {
        processed++;
      } else {
        failed++;
        errors.push(result.error || "Unknown error");

        // Mark as failed
        await supabase
          .from("wines_added")
          .update({
            status: "pending", // Reset to pending for retry
            error_message: result.error,
            retry_count: (wineEntry.retry_count || 0) + 1,
          })
          .eq("id", wineEntry.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      errors: errors.slice(0, 5), // Limit errors in response
      message: `Successfully processed ${processed} wines, ${failed} failed`,
    });
  } catch (error) {
    console.error("Wine queue processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process wine queue",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
