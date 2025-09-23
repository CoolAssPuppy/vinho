import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

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

    // Fetch wines that need enhancement for this user
    const { data: wines, error: fetchError } = await supabase
      .from("tastings")
      .select(
        `
        id,
        image_url,
        vintage:vintages (
          id,
          year,
          wine:wines (
            id,
            name,
            wine_type,
            color,
            style,
            food_pairings,
            image_url,
            producer:producers (
              id,
              name,
              region:regions (
                name,
                country
              )
            )
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .limit(100); // Check more wines but queue them for processing

    if (fetchError) {
      console.error("Error fetching wines:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch wine data" },
        { status: 500 },
      );
    }

    if (!wines || wines.length === 0) {
      return NextResponse.json({
        success: true,
        queued: 0,
        message: "No wines found to process",
      });
    }

    let queued = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Queue wines that need enhancement
    for (const tasting of wines as unknown as Array<{
      vintage: unknown;
      image_url?: string;
    }>) {
      try {
        const vintage = tasting.vintage as any;
        if (!vintage?.wine) continue;

        const wine = vintage.wine as any;
        const producer = wine.producer as any;

        // Check if wine needs enhancement
        const needsEnhancement =
          !wine.wine_type ||
          !wine.color ||
          !wine.style ||
          !wine.food_pairings ||
          !wine.image_url;

        if (!needsEnhancement) {
          skipped++;
          continue;
        }

        // Check if already queued
        const { data: existingQueue } = await supabase
          .from("wines_added")
          .select("id")
          .eq("user_id", user.id)
          .eq("processed_data->wine_name", wine.name)
          .eq(
            "processed_data->producer_name",
            producer?.name || "Unknown Producer",
          )
          .eq("status", "pending")
          .maybeSingle();

        if (existingQueue) {
          // Already queued
          continue;
        }

        // Generate idempotency key
        const idempotencyKey = [
          user.id,
          producer?.name || "unknown",
          wine.name,
          vintage.year || "nv",
          "enhancement",
        ]
          .join("|")
          .toLowerCase()
          .replace(/[^a-z0-9|]/g, "");

        // Queue for processing
        const { error: queueError } = await supabase
          .from("wines_added")
          .insert({
            user_id: user.id,
            image_url: tasting.image_url || wine.image_url || "",
            status: "pending",
            idempotency_key: idempotencyKey,
            processed_data: {
              source: "database_enhancement",
              wine_id: wine.id,
              wine_name: wine.name,
              producer_name: producer?.name || "Unknown Producer",
              vintage_year: vintage.year,
              region_name: producer?.region?.name,
              country: producer?.region?.country,
              existing_wine_type: wine.wine_type,
              existing_color: wine.color,
              existing_style: wine.style,
              existing_food_pairings: wine.food_pairings,
              existing_image_url: wine.image_url,
              tasting_image_url: tasting.image_url,
              queued_at: new Date().toISOString(),
            },
          });

        if (queueError) {
          if (!queueError.message.includes("duplicate key")) {
            errors.push(`Failed to queue ${wine.name}: ${queueError.message}`);
          }
          // Skip duplicates silently
        } else {
          queued++;
        }
      } catch (error) {
        console.error("Error queueing wine:", error);
        errors.push(`Queueing error: ${error}`);
      }
    }

    // Trigger background processing by calling the process-wine-queue endpoint
    if (queued > 0) {
      try {
        // Make a background request to start processing
        fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/process-wine-queue`,
          {
            method: "POST",
            headers: {
              Authorization: request.headers.get("Authorization") || "",
              Cookie: request.headers.get("Cookie") || "",
            },
          },
        ).catch(() => {
          // Ignore fetch errors - processing will happen on next manual trigger
        });
      } catch (error) {
        // Ignore background processing errors
      }
    }

    return NextResponse.json({
      success: true,
      queued,
      skipped,
      errors: errors.slice(0, 5), // Limit errors in response
      message:
        queued > 0
          ? `Queued ${queued} wines for enhancement. Processing will begin shortly.`
          : `${skipped} wines already have complete data. No enhancement needed.`,
    });
  } catch (error) {
    console.error("Database fix error:", error);
    return NextResponse.json(
      {
        error: "Failed to queue wines for enhancement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
