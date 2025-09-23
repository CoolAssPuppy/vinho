import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

interface QueueStatus {
  pending: number;
  working: number;
  completed: number;
  failed: number;
  total: number;
  isProcessing: boolean;
  recentlyCompleted: Array<{
    wine_name: string;
    producer_name: string;
    completed_at: string;
  }>;
  errors: Array<{
    wine_name: string;
    producer_name: string;
    error_message: string;
  }>;
}

export async function GET(request: NextRequest) {
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

    // Get queue status counts
    const { data: statusCounts, error: countError } = await supabase
      .from("wines_added")
      .select("status")
      .eq("user_id", user.id);

    if (countError) {
      console.error("Error fetching queue status:", countError);
      return NextResponse.json(
        { error: "Failed to fetch queue status" },
        { status: 500 },
      );
    }

    // Count by status
    const counts =
      statusCounts?.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    const pending = counts.pending || 0;
    const working = counts.working || 0;
    const completed = counts.completed || 0;
    const failed = counts.failed || 0;
    const total = pending + working + completed + failed;

    // Get recently completed wines (last 5)
    const { data: recentlyCompleted } = await supabase
      .from("wines_added")
      .select(
        `
        processed_data,
        processed_at
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("processed_at", { ascending: false })
      .limit(5);

    // Get recent errors (last 3)
    const { data: recentErrors } = await supabase
      .from("wines_added")
      .select(
        `
        processed_data,
        error_message
      `,
      )
      .eq("user_id", user.id)
      .not("error_message", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    const status: QueueStatus = {
      pending,
      working,
      completed,
      failed,
      total,
      isProcessing: working > 0,
      recentlyCompleted:
        recentlyCompleted?.map((item) => {
          const data = item.processed_data as {
            wine_name?: string;
            producer_name?: string;
          } | null;
          return {
            wine_name: data?.wine_name || "Unknown Wine",
            producer_name: data?.producer_name || "Unknown Producer",
            completed_at: item.processed_at || "",
          };
        }) || [],
      errors:
        recentErrors?.map((item) => {
          const data = item.processed_data as {
            wine_name?: string;
            producer_name?: string;
          } | null;
          return {
            wine_name: data?.wine_name || "Unknown Wine",
            producer_name: data?.producer_name || "Unknown Producer",
            error_message: item.error_message || "Unknown error",
          };
        }) || [],
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Queue status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get queue status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
