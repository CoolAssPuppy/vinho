import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createSupabaseClient();

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Verify the user from the token
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Clean up user-owned data (defensive even with ON DELETE CASCADE policies)
    const cleanupOperations = [
      // User's tastings
      supabase.from("tastings").delete().eq("user_id", userId),
      // User's photos
      supabase.from("photos").delete().eq("user_id", userId),
      // User's scans
      supabase.from("scans").delete().eq("user_id", userId),
      // User's wine queue items
      supabase.from("wines_added_queue").delete().eq("user_id", userId),
      // User's enrichment queue items
      supabase.from("wines_enrichment_queue").delete().eq("user_id", userId),
      // User's recommendations cache
      supabase.from("wine_recommendations_cache").delete().eq("user_id", userId),
      // User's sharing connections (as sharer)
      supabase.from("sharing_connections").delete().eq("sharer_id", userId),
      // User's sharing connections (as viewer)
      supabase.from("sharing_connections").delete().eq("viewer_id", userId),
      // User's sharing preferences
      supabase.from("user_sharing_preferences").delete().eq("user_id", userId),
      // User's profile
      supabase.from("profiles").delete().eq("id", userId),
    ];

    const results = await Promise.allSettled(cleanupOperations);

    // Log any errors but continue with deletion
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Cleanup operation ${index} failed:`, result.reason);
      }
    });

    // Delete the user from auth
    const { error: deleteError } =
      await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully deleted user: ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete account";
    console.error("Error in delete-account:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
