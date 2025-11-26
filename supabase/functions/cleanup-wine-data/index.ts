import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  verifyAdminRequest,
  handleCorsPreFlight,
  getCorsHeaders,
} from "../../shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const VINHO_SERVICE_ROLE_KEY = Deno.env.get("VINHO_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, VINHO_SERVICE_ROLE_KEY);

interface CleanupStats {
  wines_added_queue_deleted: number;
  scans_deleted: number;
  tastings_deleted: number;
  photos_deleted: number;
  wine_varietals_deleted: number;
  vintages_deleted: number;
  wines_deleted: number;
  producers_deleted: number;
}

// Main cleanup handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("Origin");

  try {
    // Verify admin key - this will fail if CLEANUP_ADMIN_KEY is not set
    const authError = verifyAdminRequest(req, "CLEANUP_ADMIN_KEY");
    if (authError) return authError;

    // Parse request for optional user_id filter
    let userId: string | null = null;
    let deleteAll = false;

    try {
      const body = await req.json();
      userId = body.user_id || null;
      deleteAll = body.delete_all === true;
    } catch {
      // No body provided, clean up everything
      deleteAll = true;
    }

    const stats: CleanupStats = {
      wines_added_queue_deleted: 0,
      scans_deleted: 0,
      tastings_deleted: 0,
      photos_deleted: 0,
      wine_varietals_deleted: 0,
      vintages_deleted: 0,
      wines_deleted: 0,
      producers_deleted: 0,
    };

    // Start transaction-like cleanup from most dependent to least dependent tables

    // 1. Delete wines_added_queue queue entries
    const winesAddedQuery = supabase.from("wines_added_queue").select("id");
    if (userId) winesAddedQuery.eq("user_id", userId);

    const { data: winesAddedToDelete } = await winesAddedQuery;

    if (winesAddedToDelete && winesAddedToDelete.length > 0) {
      const { error } = await supabase
        .from("wines_added_queue")
        .delete()
        .in(
          "id",
          winesAddedToDelete.map((w) => w.id),
        );

      if (!error) {
        stats.wines_added_queue_deleted = winesAddedToDelete.length;
      }
    }

    // 2. Delete user-specific data if user_id provided
    if (userId) {
      // Delete photos
      const { count: photosCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (photosCount) {
        await supabase.from("photos").delete().eq("user_id", userId);
        stats.photos_deleted = photosCount;
      }

      // Delete tastings
      const { count: tastingsCount } = await supabase
        .from("tastings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (tastingsCount) {
        await supabase.from("tastings").delete().eq("user_id", userId);
        stats.tastings_deleted = tastingsCount;
      }

      // Delete scans
      const { count: scansCount } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (scansCount) {
        await supabase.from("scans").delete().eq("user_id", userId);
        stats.scans_deleted = scansCount;
      }
    } else if (deleteAll) {
      // Delete all user data
      const { count: photosCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true });

      if (photosCount) {
        await supabase.from("photos").delete().gte("created_at", "1900-01-01");
        stats.photos_deleted = photosCount;
      }

      const { count: tastingsCount } = await supabase
        .from("tastings")
        .select("*", { count: "exact", head: true });

      if (tastingsCount) {
        await supabase
          .from("tastings")
          .delete()
          .gte("created_at", "1900-01-01");
        stats.tastings_deleted = tastingsCount;
      }

      const { count: scansCount } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true });

      if (scansCount) {
        await supabase.from("scans").delete().gte("created_at", "1900-01-01");
        stats.scans_deleted = scansCount;
      }
    }

    // 3. Clean up orphaned wine data if deleteAll is true
    if (deleteAll) {
      // Delete all wine_varietals
      const { count: varietalsCount } = await supabase
        .from("wine_varietals")
        .select("*", { count: "exact", head: true });

      if (varietalsCount) {
        await supabase.from("wine_varietals").delete().gte("percent", 0);
        stats.wine_varietals_deleted = varietalsCount;
      }

      // Delete all vintages
      const { count: vintagesCount } = await supabase
        .from("vintages")
        .select("*", { count: "exact", head: true });

      if (vintagesCount) {
        await supabase
          .from("vintages")
          .delete()
          .gte("created_at", "1900-01-01");
        stats.vintages_deleted = vintagesCount;
      }

      // Delete all wines
      const { count: winesCount } = await supabase
        .from("wines")
        .select("*", { count: "exact", head: true });

      if (winesCount) {
        await supabase.from("wines").delete().gte("created_at", "1900-01-01");
        stats.wines_deleted = winesCount;
      }

      // Delete all producers (except the sample one if it exists)
      const { data: producers } = await supabase
        .from("producers")
        .select("id, name")
        .neq("name", "Sample Producer");

      if (producers && producers.length > 0) {
        await supabase
          .from("producers")
          .delete()
          .in(
            "id",
            producers.map((p) => p.id),
          );
        stats.producers_deleted = producers.length;
      }
    }

    // 4. Clean up storage buckets if deleteAll
    if (deleteAll) {
      try {
        // List and delete all files in the scans bucket
        const { data: files } = await supabase.storage
          .from("scans")
          .list("", { limit: 1000 });

        if (files && files.length > 0) {
          const filePaths = files.map((f) => f.name);
          await supabase.storage.from("scans").remove(filePaths);
        }
      } catch (storageError) {
        console.error("Storage cleanup error:", storageError);
      }
    } else if (userId) {
      try {
        // Delete only user's files
        const { data: files } = await supabase.storage
          .from("scans")
          .list(userId, { limit: 1000 });

        if (files && files.length > 0) {
          const filePaths = files.map((f) => `${userId}/${f.name}`);
          await supabase.storage.from("scans").remove(filePaths);
        }
      } catch (storageError) {
        console.error("Storage cleanup error:", storageError);
      }
    }

    const response = {
      success: true,
      message: deleteAll
        ? "All wine processing data has been cleaned up"
        : userId
          ? `User ${userId} wine data has been cleaned up`
          : "Cleanup completed",
      stats,
      total_deleted: Object.values(stats).reduce(
        (sum, count) => sum + count,
        0,
      ),
    };

    console.log("Cleanup completed:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in cleanup-wine-data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
