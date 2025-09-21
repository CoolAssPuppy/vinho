"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Wine, MapPin, Globe, Grape, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Dynamically import map component to avoid SSR issues with Leaflet
const WineMap = dynamic(() => import("@/components/wine-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-muted animate-pulse rounded-lg" />
  ),
});

interface WineLocation {
  id: string;
  name: string;
  producer: string;
  region: string;
  country: string;
  year: number | null;
  varietals: string[];
  latitude: number | null;
  longitude: number | null;
  vineyard_name: string | null;
}

export default function MapPage() {
  const [wines, setWines] = useState<WineLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWine, setSelectedWine] = useState<WineLocation | null>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const fetchUserWines = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all user's wines with location data
        const { data: tastings, error } = await supabase
          .from("tastings")
          .select(
            `
            id,
            vintage:vintages!inner(
              year,
              wine:wines!inner(
                name,
                producer:producers!inner(
                  name,
                  region:regions(
                    name,
                    country,
                    geom
                  )
                )
              ),
              vineyard:vineyards(
                name,
                location,
                centroid
              ),
              wine_varietals(
                varietal:grape_varietals(name)
              )
            )
          `,
          )
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching wines:", error);
          return;
        }

        // Transform data into wine locations
        const locations: WineLocation[] = [];

        if (tastings) {
          for (const tasting of tastings) {
            if (tasting.vintage?.wine?.producer?.region) {
              // For now, use mock coordinates based on region
              // In production, these would come from the geom field
              const coords = getMockCoordinates(
                tasting.vintage.wine.producer.region.country,
                tasting.vintage.wine.producer.region.name,
              );

              locations.push({
                id: tasting.id,
                name: tasting.vintage.wine.name,
                producer: tasting.vintage.wine.producer.name,
                region: tasting.vintage.wine.producer.region.name,
                country: tasting.vintage.wine.producer.region.country,
                year: tasting.vintage.year,
                varietals:
                  tasting.vintage.wine_varietals
                    ?.map((wv: any) => wv.varietal?.name)
                    .filter(Boolean) || [],
                latitude: coords.lat,
                longitude: coords.lng,
                vineyard_name: tasting.vintage.vineyard?.name || null,
              });
            }
          }
        }

        setWines(locations);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserWines();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Wine Map</h1>
          <p className="text-muted-foreground">
            Explore the origins of your wine collection across the world
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <Skeleton className="h-[600px] w-full" />
                ) : wines.length > 0 ? (
                  <WineMap
                    wines={wines}
                    onWineSelect={setSelectedWine}
                    selectedWine={selectedWine}
                  />
                ) : (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Globe className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          No wines mapped yet
                        </h3>
                        <p className="text-muted-foreground mt-2">
                          Start scanning wines to see their origins on the map
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Collection Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Wines
                  </span>
                  <Badge variant="secondary">{wines.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Countries
                  </span>
                  <Badge variant="secondary">
                    {new Set(wines.map((w) => w.country)).size}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Regions</span>
                  <Badge variant="secondary">
                    {new Set(wines.map((w) => w.region)).size}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Selected Wine Details */}
            {selectedWine && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wine className="h-5 w-5" />
                    Wine Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{selectedWine.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedWine.producer}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedWine.region}, {selectedWine.country}
                    </span>
                  </div>

                  {selectedWine.year && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedWine.year} Vintage</span>
                    </div>
                  )}

                  {selectedWine.varietals.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Grape className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedWine.varietals.join(", ")}</span>
                    </div>
                  )}

                  {selectedWine.vineyard_name && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Vineyard</p>
                      <p className="text-sm font-medium">
                        {selectedWine.vineyard_name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Region Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Regions</CardTitle>
                <CardDescription>
                  Most visited wine regions in your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {wines.length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(
                      wines.reduce((acc: Record<string, number>, wine) => {
                        const key = `${wine.region}, ${wine.country}`;
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      }, {}),
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([region, count]) => (
                        <div
                          key={region}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm truncate">{region}</span>
                          <Badge variant="outline" className="ml-2">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No regions to display yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock function to get coordinates for regions
// In production, this would come from the database
function getMockCoordinates(
  country: string,
  region: string,
): { lat: number; lng: number } {
  const coordinates: Record<string, { lat: number; lng: number }> = {
    "Bordeaux, France": { lat: 44.8378, lng: -0.5792 },
    "Burgundy, France": { lat: 47.0525, lng: 4.3837 },
    "Napa Valley, USA": { lat: 38.3047, lng: -122.2989 },
    "Tuscany, Italy": { lat: 43.0709, lng: 11.2248 },
    "Rioja, Spain": { lat: 42.2871, lng: -2.5396 },
    "Mendoza, Argentina": { lat: -32.8895, lng: -68.8458 },
    "Barossa Valley, Australia": { lat: -34.5312, lng: 138.9883 },
    "Marlborough, New Zealand": { lat: -41.5138, lng: 173.9545 },
    "Douro Valley, Portugal": { lat: 41.1596, lng: -7.6219 },
    "Stellenbosch, South Africa": { lat: -33.9321, lng: 18.8602 },
  };

  // Try to find exact match
  const key = `${region}, ${country}`;
  if (coordinates[key]) {
    return coordinates[key];
  }

  // Fallback to country center
  const countryCoords: Record<string, { lat: number; lng: number }> = {
    France: { lat: 46.6034, lng: 1.8883 },
    Italy: { lat: 42.5045, lng: 12.6463 },
    Spain: { lat: 40.4637, lng: -3.7492 },
    USA: { lat: 37.0902, lng: -95.7129 },
    Argentina: { lat: -38.4161, lng: -63.6167 },
    Australia: { lat: -25.2744, lng: 133.7751 },
    "New Zealand": { lat: -40.9006, lng: 174.886 },
    Portugal: { lat: 39.3999, lng: -8.2245 },
    "South Africa": { lat: -30.5595, lng: 22.9375 },
  };

  return countryCoords[country] || { lat: 0, lng: 0 };
}
