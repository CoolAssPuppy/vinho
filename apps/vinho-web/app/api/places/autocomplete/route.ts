import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input");
  const types = searchParams.get("types");
  if (!input) {
    return NextResponse.json({ data: [] });
  }
  const body: Record<string, unknown> = { input };
  if (types) {
    body.includedPrimaryTypes = types.split(",");
  }
  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json({ data: data.suggestions || [] });
  } catch {
    return NextResponse.json(
      { data: [], error: "Autocomplete failed" },
      { status: 500 },
    );
  }
}
