"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Wine,
  MapPin,
  Globe,
  Grape,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";
import { useDebounce } from "@/hooks/use-debounce";
import type { Database } from "@/types/database";

// Dynamically import map component to avoid SSR issues with Leaflet
const WineMap = dynamic(() => import("@/components/wine-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[800px] w-full bg-muted animate-pulse rounded-lg" />
  ),
});

interface WineLocation {
  id: string;
  name: string;
  producer: string;
  producer_address?: string | null;
  producer_city?: string | null;
  producer_website?: string | null;
  region: string;
  country: string;
  year: number | null;
  varietals: string[];
  latitude: number | null;
  longitude: number | null;
  vineyard_name: string | null;
  tasted_location?: string | null;
  tasted_date?: Date;
}

type MapView = "origins" | "tastings";

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export default function MapPage() {
  const [wines, setWines] = useState<WineLocation[]>([]);
  const [allWines, setAllWines] = useState<WineLocation[]>([]); // Store all wines for stats
  const [loading, setLoading] = useState(true);
  const [selectedWine, setSelectedWine] = useState<WineLocation | null>(null);
  const [mapView, setMapView] = useState<MapView>("origins");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const debouncedBounds = useDebounce(mapBounds, 500);
  const hasInitialLoad = useRef(false);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Fetch wines based on viewport bounds
  const fetchWinesInBounds = useCallback(
    async (bounds: MapBounds | null) => {
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
            tasted_at,
            location_name,
            location_address,
            location_city,
            location_latitude,
            location_longitude,
            vintage:vintages (
              year,
              wine:wines (
                id,
                name,
                producer:producers (
                  id,
                  name,
                  address,
                  city,
                  postal_code,
                  website,
                  latitude,
                  longitude,
                  region:regions (
                    name,
                    country
                  )
                )
              )
            )
          `,
          )
          .eq("user_id", user.id);

        if (error) {
          // Check if it's an actual error or just no data
          if (error.code === "PGRST116") {
            // No rows found - this is fine, user just hasn't added wines yet
            console.log("No tastings found for user");
            setWines([]);
            setLoading(false);
            return;
          }
          console.error("Error fetching wines:", error.message || error);
          setLoading(false);
          return;
        }

        // If no tastings, gracefully set empty array
        if (!tastings || tastings.length === 0) {
          setWines([]);
          setLoading(false);
          return;
        }

        // Transform data into wine locations
        const locations: WineLocation[] = [];

        if (tastings) {
          for (const tasting of tastings) {
            // Type assertion to help TypeScript understand the structure
            const typedTasting = tasting as any;
            if (typedTasting.vintage?.wine?.producer) {
              const producer = typedTasting.vintage.wine.producer as any;

              // Extract region and country from producer's linked region or fallback
              const region = producer.region?.name || "Unknown Region";
              const country = producer.region?.country || "Unknown Country";

              // For origins view, use producer coordinates
              let originLat = producer.latitude;
              let originLng = producer.longitude;

              // If no coordinates, try to get from region/country as fallback
              if (!originLat || !originLng) {
                const fallbackCoords = getMockCoordinates(country, region);
                originLat = fallbackCoords.lat;
                originLng = fallbackCoords.lng;
              }

              // For tasting view, use actual tasting location if available
              const tastingLat = typedTasting.location_latitude || originLat;
              const tastingLng = typedTasting.location_longitude || originLng;
              const locationName = typedTasting.location_name;
              const locationCity = typedTasting.location_city;

              locations.push({
                id: typedTasting.id,
                name: typedTasting.vintage.wine.name,
                producer: producer.name,
                producer_address: producer.address,
                producer_city: producer.city,
                producer_website: producer.website,
                region: region,
                country: country,
                year: typedTasting.vintage.year,
                varietals: [], // TODO: fetch from wine_varietals table
                latitude: mapView === "origins" ? originLat : tastingLat,
                longitude: mapView === "origins" ? originLng : tastingLng,
                vineyard_name: null, // Mock - in production from database
                tasted_location:
                  mapView === "tastings"
                    ? locationName || locationCity || null
                    : null,
                tasted_date: typedTasting.tasted_at
                  ? new Date(typedTasting.tasted_at)
                  : undefined,
              });
            }
          }
        }

        // Store all wines for stats
        if (!hasInitialLoad.current) {
          setAllWines(locations);
          setWines(locations);
          hasInitialLoad.current = true;
        } else if (bounds) {
          // Filter locations based on viewport bounds
          const filtered = locations.filter((wine) => {
            if (!wine.latitude || !wine.longitude) return false;
            return (
              wine.latitude >= bounds.south &&
              wine.latitude <= bounds.north &&
              wine.longitude >= bounds.west &&
              wine.longitude <= bounds.east
            );
          });
          setWines(filtered);
          setAllWines(locations); // Keep all wines for stats
        } else {
          setWines(locations);
          setAllWines(locations);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    },
    [supabase, mapView],
  );

  // Initial load
  useEffect(() => {
    fetchWinesInBounds(null);
  }, []);

  // Handle bounds changes
  useEffect(() => {
    if (debouncedBounds && hasInitialLoad.current) {
      fetchWinesInBounds(debouncedBounds);
    }
  }, [debouncedBounds, fetchWinesInBounds]);

  // Handle view mode changes
  useEffect(() => {
    if (hasInitialLoad.current) {
      fetchWinesInBounds(mapBounds);
    }
  }, [mapView, mapBounds, fetchWinesInBounds]);

  // Handle map bounds update
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">Wine Map</h1>
              <p className="text-muted-foreground">
                {mapView === "origins"
                  ? "Explore where your wines come from"
                  : "See where you've enjoyed your wines"}
              </p>
            </div>

            {/* Toggle between map views */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                variant={mapView === "origins" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapView("origins")}
                className="gap-2"
              >
                <Globe className="h-4 w-4" />
                Wine Origins
              </Button>
              <Button
                variant={mapView === "tastings" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMapView("tastings")}
                className="gap-2"
              >
                <MapPin className="h-4 w-4" />
                Tasting Locations
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <Skeleton className="h-[800px] w-full" />
                ) : allWines.length > 0 ? (
                  <WineMap
                    wines={wines}
                    onWineSelect={setSelectedWine}
                    selectedWine={selectedWine}
                    onBoundsChange={handleBoundsChange}
                  />
                ) : (
                  <div className="h-[800px] flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Globe className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="text-xl font-semibold">
                          No wines mapped yet
                        </h3>
                        <p className="text-muted-foreground mt-2">
                          Start scanning wines to see their{" "}
                          {mapView === "origins"
                            ? "origins"
                            : "tasting locations"}{" "}
                          on the map
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
                  <Badge variant="secondary">{allWines.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {mapView === "origins" ? "Countries" : "Tasting Locations"}
                  </span>
                  <Badge variant="secondary">
                    {mapView === "origins"
                      ? new Set(allWines.map((w) => w.country)).size
                      : new Set(
                          allWines
                            .map((w) => w.tasted_location)
                            .filter(Boolean),
                        ).size}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {mapView === "origins" ? "Regions" : "Recent Tastings"}
                  </span>
                  <Badge variant="secondary">
                    {mapView === "origins"
                      ? new Set(allWines.map((w) => w.region)).size
                      : allWines.filter((w) => {
                          if (!w.tasted_date) return false;
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return w.tasted_date > thirtyDaysAgo;
                        }).length}
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
                      {mapView === "origins"
                        ? `${selectedWine.region}, ${selectedWine.country}`
                        : selectedWine.tasted_location ||
                          "Location not recorded"}
                    </span>
                  </div>

                  {selectedWine.producer_address && (
                    <div className="text-sm space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Producer Address:
                      </p>
                      <p>{selectedWine.producer_address}</p>
                      {selectedWine.producer_city && (
                        <p>{selectedWine.producer_city}</p>
                      )}
                    </div>
                  )}

                  {selectedWine.producer_website && (
                    <div className="text-sm">
                      <a
                        href={
                          selectedWine.producer_website.startsWith("http")
                            ? selectedWine.producer_website
                            : `https://${selectedWine.producer_website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        Visit Website
                      </a>
                    </div>
                  )}

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

                  {mapView === "tastings" && selectedWine.tasted_date && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Tasted On</p>
                      <p className="text-sm font-medium">
                        {selectedWine.tasted_date.toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Region/Location Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {mapView === "origins" ? "Top Regions" : "Favorite Spots"}
                </CardTitle>
                <CardDescription>
                  {mapView === "origins"
                    ? "Most visited wine regions in your collection"
                    : "Where you taste wines most often"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allWines.length > 0 ? (
                  <div className="space-y-2">
                    {mapView === "origins"
                      ? Object.entries(
                          allWines.reduce(
                            (acc: Record<string, number>, wine) => {
                              const key = `${wine.region}, ${wine.country}`;
                              acc[key] = (acc[key] || 0) + 1;
                              return acc;
                            },
                            {},
                          ),
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
                          ))
                      : Object.entries(
                          allWines
                            .filter((w) => w.tasted_location)
                            .reduce((acc: Record<string, number>, wine) => {
                              const key = wine.tasted_location!;
                              acc[key] = (acc[key] || 0) + 1;
                              return acc;
                            }, {}),
                        )
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([location, count]) => (
                            <div
                              key={location}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm truncate">
                                {location}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {count}
                              </Badge>
                            </div>
                          ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No {mapView === "origins" ? "regions" : "locations"} to
                    display yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top Varietals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Grape className="h-5 w-5" />
                  Top Varietals
                </CardTitle>
                <CardDescription>
                  Most common grape varieties in your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allWines.length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(
                      allWines.reduce((acc: Record<string, number>, wine) => {
                        wine.varietals.forEach((varietal) => {
                          acc[varietal] = (acc[varietal] || 0) + 1;
                        });
                        return acc;
                      }, {}),
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([varietal, count]) => (
                        <div
                          key={varietal}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm truncate">{varietal}</span>
                          <Badge variant="outline" className="ml-2">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start scanning wines to see live data
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Wine Styles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wine className="h-5 w-5" />
                  Wine Styles
                </CardTitle>
                <CardDescription>Distribution by wine type</CardDescription>
              </CardHeader>
              <CardContent>
                {allWines.length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(
                      allWines.reduce((acc: Record<string, number>, wine) => {
                        // Mock wine style - in production this would come from the database
                        const style = wine.varietals.some((v) =>
                          [
                            "Chardonnay",
                            "Sauvignon Blanc",
                            "Riesling",
                            "Pinot Grigio",
                          ].includes(v),
                        )
                          ? "White"
                          : wine.varietals.some((v) =>
                                [
                                  "Cabernet Sauvignon",
                                  "Merlot",
                                  "Pinot Noir",
                                  "Syrah",
                                ].includes(v),
                              )
                            ? "Red"
                            : wine.varietals.some((v) =>
                                  ["Rosé", "Provence"].includes(v),
                                )
                              ? "Rosé"
                              : wine.name.toLowerCase().includes("champagne") ||
                                  wine.name.toLowerCase().includes("prosecco")
                                ? "Sparkling"
                                : wine.name.toLowerCase().includes("port")
                                  ? "Fortified"
                                  : "Other";

                        acc[style] = (acc[style] || 0) + 1;
                        return acc;
                      }, {}),
                    )
                      .sort(([, a], [, b]) => b - a)
                      .map(([style, count]) => (
                        <div
                          key={style}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{style}</span>
                          <Badge
                            variant="outline"
                            className="ml-2"
                            style={{
                              borderColor:
                                style === "Red"
                                  ? "#8b0000"
                                  : style === "White"
                                    ? "#f4e4b1"
                                    : style === "Rosé"
                                      ? "#ffb6c1"
                                      : style === "Sparkling"
                                        ? "#ffd700"
                                        : style === "Fortified"
                                          ? "#4b0082"
                                          : "#666",
                              color:
                                style === "Red"
                                  ? "#8b0000"
                                  : style === "White"
                                    ? "#8b7500"
                                    : style === "Rosé"
                                      ? "#ff69b4"
                                      : style === "Sparkling"
                                        ? "#daa520"
                                        : style === "Fortified"
                                          ? "#4b0082"
                                          : "#666",
                            }}
                          >
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start scanning wines to see live data
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Most Recent Additions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Additions
                </CardTitle>
                <CardDescription>
                  Latest wines added to your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allWines.length > 0 ? (
                  <div className="space-y-3">
                    {allWines
                      .sort((a, b) => {
                        // Sort by tasted date if available
                        if (a.tasted_date && b.tasted_date) {
                          return (
                            b.tasted_date.getTime() - a.tasted_date.getTime()
                          );
                        }
                        return 0;
                      })
                      .slice(0, 3)
                      .map((wine) => (
                        <div key={wine.id} className="flex flex-col space-y-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium truncate">
                                {wine.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {wine.producer}
                              </p>
                            </div>
                            {wine.year && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                {wine.year}
                              </Badge>
                            )}
                          </div>
                          {wine.tasted_date && (
                            <p className="text-xs text-muted-foreground">
                              Added {wine.tasted_date.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start scanning wines to see live data
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
    "Etna, Italy": { lat: 37.751, lng: 14.9934 }, // Mount Etna, Sicily
    "Sicily, Italy": { lat: 37.6, lng: 14.0154 }, // Sicily center
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

// Mock function to get tasting location coordinates
// In production, this would use actual GPS coordinates
function getMockTastingLocation(
  location: string,
): { lat: number; lng: number } | null {
  const tastingLocations: Record<string, { lat: number; lng: number }> = {
    "San Francisco": { lat: 37.7749, lng: -122.4194 },
    "New York": { lat: 40.7128, lng: -74.006 },
    London: { lat: 51.5074, lng: -0.1278 },
    Paris: { lat: 48.8566, lng: 2.3522 },
    Tokyo: { lat: 35.6762, lng: 139.6503 },
    Sydney: { lat: -33.8688, lng: 151.2093 },
    "Los Angeles": { lat: 34.0522, lng: -118.2437 },
    Chicago: { lat: 41.8781, lng: -87.6298 },
    Miami: { lat: 25.7617, lng: -80.1918 },
    Seattle: { lat: 47.6062, lng: -122.3321 },
  };

  return tastingLocations[location] || null;
}
