"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Wine,
  MapPin,
  Globe,
  ToggleLeft,
  ToggleRight,
  Star,
  Activity,
  RefreshCw,
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
import type { Database } from "@/lib/database.types";
import type { WineLocation, RecentWine, WineStats } from "@/lib/types/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogContentNoX } from "@/components/ui/dialog-no-x";
import { TastingNoteForm } from "@/components/tasting/tasting-note-form";

// Dynamically import map component to avoid SSR issues with Leaflet
const WineMap = dynamic(() => import("@/components/map/WineMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-muted animate-pulse rounded-lg" />
  ),
});

type MapView = "origins" | "tastings";

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export default function MapPage() {
  const [wines, setWines] = useState<WineLocation[]>([]);
  const [recentWines, setRecentWines] = useState<RecentWine[]>([]);
  const [stats, setStats] = useState<WineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasWines, setHasWines] = useState(false);
  const [selectedWine, setSelectedWine] = useState<WineLocation | null>(null);
  const [mapView, setMapView] = useState<MapView>("origins");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedTasting, setSelectedTasting] = useState<RecentWine | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const debouncedBounds = useDebounce(mapBounds, 500);
  const hasInitialLoad = useRef(false);
  // const router = useRouter();

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Fetch complete stats from materialized view
  const fetchStats = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch stats from secure view (automatically filters by auth.uid())
      const { data: statsData } = await supabase
        .from("user_wine_stats")
        .select("*")
        .single();

      if (statsData) {
        setStats(statsData as WineStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [supabase]);

  // Fetch recent wines
  const fetchRecentWines = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: recentData } = await supabase
        .from("tastings")
        .select(
          `
          id,
          verdict,
          notes,
          detailed_notes,
          tasted_at,
          location_name,
          location_address,
          location_city,
          location_latitude,
          location_longitude,
          vintage:vintages (
            id,
            year,
            abv,
            wine:wines (
              name,
              producer:producers (
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
        .order("tasted_at", { ascending: false })
        .limit(10);

      if (recentData) {
        type _TastingData = typeof recentData[0];
        const formattedRecent: RecentWine[] = recentData.map(
          (tasting) => ({
            id: tasting.id,
            wine_name: tasting.vintage?.wine?.name || "Unknown Wine",
            producer_name:
              tasting.vintage?.wine?.producer?.name || "Unknown Producer",
            region: tasting.vintage?.wine?.producer?.region?.name || "",
            country: tasting.vintage?.wine?.producer?.region?.country || "",
            vintage_year: tasting.vintage?.year,
            vintage_id: tasting.vintage?.id,
            abv: tasting.vintage?.abv,
            rating: tasting.verdict,
            tasted_at: tasting.tasted_at || null,
            location_name: tasting.location_name,
            location_address: tasting.location_address,
            location_city: tasting.location_city,
            location_latitude: tasting.location_latitude,
            location_longitude: tasting.location_longitude,
            notes: tasting.notes,
            detailed_notes: tasting.detailed_notes,
          }),
        );

        setRecentWines(formattedRecent);
      }
    } catch (error) {
      console.error("Error fetching recent wines:", error);
    }
  }, [supabase]);

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
          .eq("user_id", user.id)
          .order("tasted_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("Error fetching wines:", error.message || error);
          setLoading(false);
          return;
        }

        if (!tastings || tastings.length === 0) {
          setWines([]);
          setHasWines(false);
          setLoading(false);
          return;
        }

        // Transform data into wine locations
        const locations: WineLocation[] = [];

        for (const tasting of tastings) {
          const typedTasting = tasting;
          if (typedTasting.vintage?.wine?.producer) {
            const producer = typedTasting.vintage.wine.producer;
            const region = producer.region?.name || "";
            const country = producer.region?.country || "";

            // For origins view, use producer coordinates
            const originLat = producer.latitude;
            const originLng = producer.longitude;

            // For tasting view, use actual tasting location if available
            const tastingLat = typedTasting.location_latitude || originLat;
            const tastingLng = typedTasting.location_longitude || originLng;

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
              varietals: [],
              latitude: mapView === "origins" ? originLat : tastingLat,
              longitude: mapView === "origins" ? originLng : tastingLng,
              vineyard_name: null,
              tasted_location:
                mapView === "tastings"
                  ? typedTasting.location_name ||
                    typedTasting.location_city ||
                    null
                  : null,
              tasted_date: typedTasting.tasted_at
                ? new Date(typedTasting.tasted_at)
                : undefined,
            });
          }
        }

        // Filter only wines with valid coordinates
        const validLocations = locations.filter(
          (w) => w.latitude && w.longitude,
        );

        // Track if we have ANY wines with coordinates (for showing map vs empty state)
        setHasWines(validLocations.length > 0);

        // Filter by bounds if provided
        let filtered = validLocations;
        if (bounds && hasInitialLoad.current) {
          filtered = validLocations.filter((wine) => {
            return (
              wine.latitude! >= bounds.south &&
              wine.latitude! <= bounds.north &&
              wine.longitude! >= bounds.west &&
              wine.longitude! <= bounds.east
            );
          });
        }

        // Show max 20 wines in viewport for performance
        setWines(filtered.slice(0, 20));
        setLoading(false);

        if (!hasInitialLoad.current) {
          hasInitialLoad.current = true;
        }
      } catch (error) {
        console.error("Error in fetchWinesInBounds:", error);
        setLoading(false);
      }
    },
    [supabase, mapView],
  );

  // Initial load
  useEffect(() => {
    fetchWinesInBounds(null);
    fetchStats();
    fetchRecentWines();
  }, [fetchWinesInBounds, fetchStats, fetchRecentWines]);

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
  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    setMapBounds(newBounds);
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchWinesInBounds(mapBounds),
      fetchStats(),
      fetchRecentWines(),
    ]);
    setRefreshing(false);
  }, [mapBounds, fetchWinesInBounds, fetchStats, fetchRecentWines]);

  // Handle tasting edit
  const handleEditTasting = (wine: RecentWine) => {
    setSelectedTasting(wine);
    setIsEditDialogOpen(true);
  };

  // Handle save tasting
  const handleSaveTasting = async () => {
    setIsEditDialogOpen(false);
    setSelectedTasting(null);
    // Refresh the recent wines
    await fetchRecentWines();
  };

  // Stats cards configuration
  const statsCards = [
    {
      title: "Unique Wines",
      value: stats?.unique_wines || 0,
      icon: Wine,
      description: `from ${stats?.total_tastings || 0} tastings`,
      color: "text-purple-500",
    },
    {
      title: "Countries",
      value: stats?.unique_countries || 0,
      icon: Globe,
      description: `${stats?.unique_regions || 0} regions explored`,
      color: "text-blue-500",
    },
    {
      title: "Average Rating",
      value: (stats?.average_rating || 0).toFixed(1),
      icon: Star,
      description: `${stats?.favorites || 0} favorites (4+ stars)`,
      color: "text-yellow-500",
    },
    {
      title: "Recent Activity",
      value: stats?.tastings_last_30_days || 0,
      icon: Activity,
      description: "Tastings last 30 days",
      color: "text-green-500",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wine Map</h1>
          <p className="text-muted-foreground">
            Explore your wine journey across the world
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">View:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setMapView(mapView === "origins" ? "tastings" : "origins")
            }
            className="gap-2"
          >
            {mapView === "origins" ? (
              <>
                <MapPin className="h-4 w-4" />
                Wine Origins
              </>
            ) : (
              <>
                <Wine className="h-4 w-4" />
                Tasting Locations
              </>
            )}
            {mapView === "origins" ? (
              <ToggleLeft className="h-4 w-4" />
            ) : (
              <ToggleRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards - Four across */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="h-[600px] w-full" />
          ) : hasWines ? (
            <div className="h-[600px]">
              <WineMap
                wines={wines}
                onWineSelect={setSelectedWine}
                selectedWine={selectedWine}
                onBoundsChange={handleBoundsChange}
              />
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <Globe className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold">No wines mapped yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Start scanning wines to see their{" "}
                    {mapView === "origins" ? "origins" : "tasting locations"} on
                    the map
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Additions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Additions</CardTitle>
          <CardDescription>
            Your latest wine discoveries and tastings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wine</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Vintage</TableHead>
                <TableHead className="text-center">ABV</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentWines.map((wine) => (
                <TableRow
                  key={wine.id}
                  onClick={() => handleEditTasting(wine)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    {wine.wine_name}
                  </TableCell>
                  <TableCell>{wine.producer_name}</TableCell>
                  <TableCell>
                    {wine.region && wine.country ? (
                      <span className="text-sm">
                        {wine.region}, {wine.country}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {wine.vintage_year || (
                      <span className="text-muted-foreground">NV</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {wine.abv ? (
                      <Badge variant="outline">{wine.abv}%</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {wine.rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">
                          {wine.rating}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {wine.location_name || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {wine.tasted_at ? new Date(wine.tasted_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Tasting Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContentNoX className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Tasting Notes - {selectedTasting?.producer_name}
            </DialogTitle>
          </DialogHeader>
          {selectedTasting && (
            <TastingNoteForm
              tastingId={selectedTasting.id}
              vintageId={selectedTasting.vintage_id || ''}
              initialRating={selectedTasting.rating || 0}
              initialNotes={selectedTasting.notes || ""}
              initialDetailedNotes={selectedTasting.detailed_notes || ""}
              initialTastedAt={selectedTasting.tasted_at || undefined}
              initialLocationName={selectedTasting.location_name || ""}
              initialLocationAddress={selectedTasting.location_address || ""}
              initialLocationCity={selectedTasting.location_city || ""}
              initialLocationLat={selectedTasting.location_latitude}
              initialLocationLng={selectedTasting.location_longitude}
              onSave={handleSaveTasting}
              onDelete={async () => {
                if (selectedTasting) {
                  const { error } = await supabase
                    .from("tastings")
                    .delete()
                    .eq("id", selectedTasting.id);

                  if (!error) {
                    setIsEditDialogOpen(false);
                    // Refresh the data
                    await fetchRecentWines();
                    await fetchWinesInBounds(debouncedBounds);
                  }
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContentNoX>
      </Dialog>
    </div>
  );
}
