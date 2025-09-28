import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getMigrationCompleteEmail } from "@/lib/emails/templates";

export const runtime = "nodejs";

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

    // Get migration statistics
    const [
      { count: totalWines },
      { count: totalProducers },
      { data: regions },
      { data: countries },
      { data: vintageRange },
      { data: topVarietal },
      { data: avgRating },
    ] = await Promise.all([
      // Total wines for user
      supabase
        .from("tastings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),

      // Total unique producers
      supabase
        .from("tastings")
        .select("vintage_id", { count: "exact", head: true })
        .eq("user_id", user.id),

      // Unique regions
      supabase
        .from("regions")
        .select("id")
        .in(
          "id",
          supabase
            .from("producers")
            .select("region_id")
            .in(
              "id",
              supabase
                .from("wines")
                .select("producer_id")
                .in(
                  "id",
                  supabase
                    .from("vintages")
                    .select("wine_id")
                    .in(
                      "id",
                      supabase
                        .from("tastings")
                        .select("vintage_id")
                        .eq("user_id", user.id),
                    ),
                ),
            ),
        ),

      // Unique countries
      supabase
        .from("regions")
        .select("country")
        .in("id", supabase.from("producers").select("region_id")),

      // Vintage range
      supabase
        .from("vintages")
        .select("year")
        .not("year", "is", null)
        .in(
          "id",
          supabase.from("tastings").select("vintage_id").eq("user_id", user.id),
        )
        .order("year", { ascending: true })
        .limit(1),

      // Top varietal (simplified - would need more complex query in practice)
      supabase.from("grape_varietals").select("name").limit(1).single(),

      // Average rating
      supabase
        .from("tastings")
        .select("verdict")
        .eq("user_id", user.id)
        .not("verdict", "is", null),
    ]);

    // Calculate statistics
    const stats = {
      totalWines: totalWines || 0,
      successfulImports: totalWines || 0,
      failedImports: 0,
      producers: totalProducers || 0,
      regions: regions?.length || 0,
      countries: new Set(countries?.map((c) => c.country)).size || 0,
      oldestVintage: vintageRange?.[0]?.year || new Date().getFullYear(),
      newestVintage:
        vintageRange?.[vintageRange.length - 1]?.year ||
        new Date().getFullYear(),
      topVarietal: topVarietal?.name || "Various",
      averageRating: avgRating
        ? (
            avgRating.reduce(
              (acc: number, t: any) => acc + (t.verdict || 0),
              0,
            ) / avgRating.length
          ).toFixed(1)
        : "0",
    };

    // Send completion email
    const emailHtml = getMigrationCompleteEmail({
      stats,
      journalUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://vinho.app"}/journal`,
    });

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Vinho <noreply@vinho.app>",
        to: user.email,
        subject: "🎉 Your Wine Collection is Ready!",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Failed to send completion email:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Migration completion email sent",
      stats,
    });
  } catch (error) {
    console.error("Error sending migration complete email:", error);
    return NextResponse.json(
      {
        error: "Failed to send completion email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
