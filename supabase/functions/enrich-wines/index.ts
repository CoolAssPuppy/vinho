import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCorsPreFlight,
  getCorsHeaders,
} from "../../shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Main handler - queues wines for enrichment (used by VivinoMigration)
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("Origin");

  try {
    // Get the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Get the user from the JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Parse request body
    const { action } = await req.json();

    if (action === "enrich") {
      // Fetch wines that need enhancement for this user
      const { data: tastings, error: fetchError } = await supabase
        .from("tastings")
        .select(
          `
          id,
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
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) {
        throw fetchError;
      }

      if (!tastings || tastings.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "No wines found for enhancement",
            queued: 0,
            skipped: 0,
          }),
          { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
        );
      }

      let queued = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const tasting of tastings) {
        try {
          const vintage = tasting.vintage as any;
          if (!vintage || !vintage.wine) {
            skipped++;
            continue;
          }

          const wine = vintage.wine;
          const producer = wine.producer;

          // Check if wine needs enhancement
          const needsEnhancement =
            !wine.wine_type ||
            !wine.color ||
            !wine.style ||
            !wine.food_pairings ||
            wine.food_pairings.length === 0;

          if (!needsEnhancement) {
            skipped++;
            continue;
          }

          // Check if already queued
          const { data: existing } = await supabase
            .from("wines_enrichment_queue")
            .select("id")
            .eq("vintage_id", vintage.id)
            .eq("status", "pending")
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          // Queue for enrichment with lower priority than new scans
          const { error: queueError } = await supabase
            .from("wines_enrichment_queue")
            .insert({
              vintage_id: vintage.id,
              wine_id: wine.id,
              user_id: user.id,
              producer_name: producer?.name || "Unknown Producer",
              wine_name: wine.name,
              year: vintage.year,
              region: producer?.region?.name,
              country: producer?.region?.country,
              existing_varietals: [], // Will be enriched
              priority: 0, // Lower priority for bulk enrichment
            });

          if (queueError) {
            if (!queueError.message.includes("duplicate")) {
              errors.push(
                `Failed to queue ${wine.name}: ${queueError.message}`,
              );
            }
          } else {
            queued++;
          }
        } catch (error) {
          console.error("Error queueing wine:", error);
          errors.push(`Queueing error: ${error}`);
        }
      }

      // Trigger processing of the queue
      if (queued > 0) {
        try {
          // Invoke the enrichment processor
          await supabase.functions.invoke("process-enrichment-queue", {
            body: { limit: 5 },
          });
        } catch (error) {
          console.error("Failed to trigger enrichment processing:", error);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          enriched: queued, // For backward compatibility with UI
          queued,
          skipped,
          errors: errors.slice(0, 5), // Limit errors in response
          message: `Queued ${queued} wines for enrichment, ${skipped} already complete or queued`,
        }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in enrich-wines:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } },
    );
  }
});