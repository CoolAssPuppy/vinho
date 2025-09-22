import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");
  if (!placeId) {
    return NextResponse.json({ data: null });
  }
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "displayName,formattedAddress,nationalPhoneNumber,shortFormattedAddress,location",
        },
      },
    );
    const data = await res.json();
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Place details error", err);
    return NextResponse.json(
      { data: null, error: "Place lookup failed" },
      { status: 500 },
    );
  }
}
