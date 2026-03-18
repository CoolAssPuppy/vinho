"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
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
import { createClient } from "@/lib/supabase";
import type { WineLocation, RecentWine } from "@/lib/types/shared";
import { useMapData } from "@/hooks/use-map-data";
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
import { TastingNoteForm } from "@/components/tasting/TastingNoteForm";

// Dynamically import map component to avoid SSR issues with Leaflet
const WineMap = dynamic(() => import("@/components/map/WineMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-muted animate-pulse rounded-lg" />
  ),
});


export default function MapPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWine, setSelectedWine] = useState<WineLocation | null>(null);
  const [mapView, setMapView] = useState<"origins" | "tastings">("origins");
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [selectedTasting, setSelectedTasting] = useState<RecentWine | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const supabase = createClient();

  const {
    wines,
    recentWines,
    stats,
    loading,
    hasWines,
    debouncedBounds,
    fetchWinesInBounds,
    fetchStats,
    fetchRecentWines,
  } = useMapData({ mapView, mapBounds });

  // Handle map bounds update
  const handleBoundsChange = useCallback((newBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
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

  // Stats cards configuration - memoized to prevent re-creation on every render
  const statsCards = useMemo(() => [
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
  ], [stats]);

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
