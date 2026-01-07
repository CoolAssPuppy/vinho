import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getMigrationCompleteEmail } from "@/lib/emails/templates";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
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

    // Get basic migration statistics
    const { count: totalWines } = await supabase
      .from("tastings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get unique producers count through tastings
    const { data: tastingData } = await supabase
      .from("tastings")
      .select(`
        vintages (
          wines (
            producer_id,
            producers (
              id,
              name,
              regions (
                name,
                country
              )
            )
          )
        )
      `)
      .eq("user_id", user.id);

    // Process the data to get unique counts
    const uniqueProducers = new Set();
    const uniqueRegions = new Set();
    const uniqueCountries = new Set();
    const years: number[] = [];

    if (tastingData) {
      tastingData.forEach((tasting) => {
        const vintage = tasting.vintages;
        if (vintage) {
          const wine = vintage.wines;
          if (wine) {
            const producer = wine.producers;
            if (producer) {
              uniqueProducers.add(producer.id);
              if (producer.regions) {
                uniqueRegions.add(producer.regions.name);
                uniqueCountries.add(producer.regions.country);
              }
            }
          }
        }
      });
    }

    // Get vintage years
    const { data: vintageData } = await supabase
      .from("vintages")
      .select("year")
      .not("year", "is", null)
      .order("year", { ascending: true });

    if (vintageData) {
      vintageData.forEach(v => {
        if (v.year) years.push(v.year);
      });
    }

    // Get average rating
    const { data: ratingData } = await supabase
      .from("tastings")
      .select("verdict")
      .eq("user_id", user.id)
      .not("verdict", "is", null);

    const averageRating = ratingData && ratingData.length > 0
      ? (ratingData.reduce((acc, t) => acc + (t.verdict || 0), 0) / ratingData.length).toFixed(1)
      : "0";

    // Calculate statistics
    const stats = {
      totalWines: totalWines || 0,
      successfulImports: totalWines || 0,
      failedImports: 0,
      producers: uniqueProducers.size,
      regions: uniqueRegions.size,
      countries: uniqueCountries.size,
      oldestVintage: years.length > 0 ? Math.min(...years) : new Date().getFullYear(),
      newestVintage: years.length > 0 ? Math.max(...years) : new Date().getFullYear(),
      topVarietal: "Various", // Simplified since grape_varietals isn't available
      averageRating,
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
        subject: "🎉 Your Tasting Journal is Ready!",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      return NextResponse.json(
        { error: "Failed to send email", details: errorText },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tasting journal completion email sent",
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send completion email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}