"use client";

import { useEffect, useState } from "react";
import {
  Wine,
  Camera,
  BookOpen,
  MapPin,
  Loader2,
  Utensils,
  Star,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { TastingNoteForm } from "@/components/tasting/tasting-note-form";
import { TastingCard } from "@/components/journal/tasting-card";
import { SearchBar } from "@/components/journal/SearchBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

type Tasting = {
  id: string;
  verdict: number | null;
  notes: string | null;
  detailed_notes: string | null;
  tasted_at: string;
  location_name?: string | null;
  location_address?: string | null;
  location_city?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  vintage: {
    id: string;
    year: number | null;
    wine: {
      name: string;
      producer: {
        name: string;
        city?: string | null;
      };
    };
  };
};

type WineRecommendation = {
  restaurant_name: string;
  city: string;
  wine_recommendation: string;
  price_point?: string;
};

type SuggestionsTabProps = {
  tastings: Tasting[];
  supabase: ReturnType<typeof createBrowserClient<Database>>;
};

function SuggestionsTab({ tastings, supabase }: SuggestionsTabProps) {
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<WineRecommendation[]>(
    [],
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Use a free reverse geocoding service that doesn't require API key
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );

          if (response.ok) {
            const data = await response.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.municipality ||
              data.address?.county ||
              "your location";
            setUserLocation(city);
          } else {
            // Fallback to a simple location string
            setUserLocation("your area");
          }
        } catch {
          // If geocoding fails, just use a generic location
          setUserLocation("your area");
        }
        setIsLoadingLocation(false);
      },
      (error) => {
        // When geolocation fails, show manual input instead of error
        setShowManualInput(true);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const getWineRecommendations = async () => {
    if (!userLocation || tastings.length === 0) return;

    setIsLoadingRecommendations(true);

    try {
      // Get the 10 most recent 4 and 5 star wines
      const highRatedWines = tastings
        .filter((t) => t.verdict && t.verdict >= 4)
        .slice(0, 10)
        .map((t) => ({
          producer: t.vintage.wine.producer.name,
          wine: t.vintage.wine.name,
          year: t.vintage.year,
          rating: t.verdict,
        }));

      if (highRatedWines.length === 0) {
        setRecommendations([]);
        setIsLoadingRecommendations(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated");
      }

      const response = await supabase.functions.invoke("wine-recommendations", {
        body: {
          wines: highRatedWines,
          city: userLocation,
        },
      });

      if (response.error) {
        throw new Error(
          response.error.message || "Failed to get recommendations",
        );
      }

      if (response.data) {
        setRecommendations(response.data.recommendations || []);
      }
    } catch (error) {
      console.error("Error getting wine recommendations:", error);
    }

    setIsLoadingRecommendations(false);
  };

  const highRatedCount = tastings.filter(
    (t) => t.verdict && t.verdict >= 4,
  ).length;

  if (isLoadingLocation) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Getting your location...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showManualInput && !userLocation) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <MapPin className="h-16 w-16 mx-auto text-blue-400" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Enter Your Location</h3>
              <p className="text-muted-foreground">
                Enter your current location to find restaurants near you:
              </p>
              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualLocation.trim()) {
                      setUserLocation(manualLocation.trim());
                      setShowManualInput(false);
                    }
                  }}
                  placeholder="e.g. San Francisco, New York, London"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <Button
                  onClick={() => {
                    if (manualLocation.trim()) {
                      setUserLocation(manualLocation.trim());
                      setShowManualInput(false);
                    }
                  }}
                  disabled={!manualLocation.trim()}
                >
                  Set Location
                </Button>
              </div>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  getUserLocation();
                }}
                className="text-sm text-muted-foreground hover:text-primary underline"
              >
                Try automatic detection again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (highRatedCount < 3) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <Star className="h-16 w-16 mx-auto text-yellow-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">More Tastings Needed</h3>
              <p className="text-muted-foreground">
                Rate at least 3 wines with 4 or 5 stars to get personalized
                restaurant recommendations in {userLocation}.
              </p>
              <p className="text-sm text-muted-foreground">
                Current 4-5 star wines: {highRatedCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Wine Suggestions for {userLocation}
          </h3>
          <p className="text-sm text-muted-foreground">
            Based on your {highRatedCount} highly-rated wines
          </p>
        </div>
        <Button
          onClick={getWineRecommendations}
          disabled={isLoadingRecommendations}
          className="bg-primary hover:bg-primary/90"
        >
          {isLoadingRecommendations ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finding Wines...
            </>
          ) : (
            <>
              <Utensils className="mr-2 h-4 w-4" />
              Get Recommendations
            </>
          )}
        </Button>
      </div>

      {recommendations.length > 0 ? (
        <div className="grid gap-4">
          {recommendations.map((rec, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{rec.restaurant_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {rec.city}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <p className="font-medium text-sm">
                      {rec.wine_recommendation}
                    </p>
                  </div>

                  <div className="flex items-center justify-end">
                    {rec.price_point && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{rec.price_point}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isLoadingRecommendations ? (
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <Utensils className="h-16 w-16 mx-auto text-primary/30" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Ready for Recommendations
                </h3>
                <p className="text-muted-foreground">
                  Click "Get Recommendations" to discover wines similar to your
                  favorites at restaurants in {userLocation}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function JournalPage() {
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [filteredTastings, setFilteredTastings] = useState<Tasting[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTasting, setSelectedTasting] = useState<Tasting | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [pendingWinesCount, setPendingWinesCount] = useState(0);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 12;

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchTastings = async (loadMore = false) => {
    if (!loadMore) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const from = loadMore ? page * PAGE_SIZE : 0;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
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
        image_url,
        vintage:vintage_id (
          id,
          year,
          wine:wine_id (
            name,
            producer:producer_id (
              name
            )
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("tasted_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching tastings:", error);
    } else if (data) {
      // Transform the nested data structure
      const transformedData = data
        .map((item: any) => ({
          id: item.id,
          verdict: item.verdict,
          notes: item.notes,
          detailed_notes: item.detailed_notes,
          tasted_at: item.tasted_at,
          location_name: item.location_name,
          location_city: item.location_city,
          image_url: item.image_url,
          vintage: item.vintage
            ? {
                id: item.vintage.id,
                year: item.vintage.year,
                wine: item.vintage.wine
                  ? {
                      name: item.vintage.wine.name,
                      producer: item.vintage.wine.producer
                        ? {
                            name: item.vintage.wine.producer.name,
                            city: null, // producers table doesn't have a city column
                          }
                        : null,
                    }
                  : null,
              }
            : null,
        }))
        .filter((item) => item.vintage !== null) as Tasting[];

      // Set has more based on whether we got a full page
      setHasMore(data.length === PAGE_SIZE + 1);

      // Remove the extra item we fetched to check hasMore
      const itemsToShow =
        data.length > PAGE_SIZE
          ? transformedData.slice(0, PAGE_SIZE)
          : transformedData;

      if (loadMore) {
        setTastings((prev) => [...prev, ...itemsToShow]);
        setPage((prev) => prev + 1);
      } else {
        setTastings(itemsToShow);
        setPage(1);
      }
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  };

  useEffect(() => {
    const setupData = async () => {
      await fetchTastings();
      await fetchPendingWines();

      // Set up realtime subscription for wines_added status changes
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("wines_added_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wines_added",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Refresh pending wines count when wines_added changes
            fetchPendingWines();

            // If a wine just completed, refresh tastings
            if (
              payload.new &&
              (payload.new as Record<string, unknown>).status === "completed"
            ) {
              fetchTastings();
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupData();
  }, []);

  const fetchPendingWines = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("wines_added")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "working"]);

    if (!error && data) {
      setPendingWinesCount(data.length);
    } else {
      setPendingWinesCount(0);
    }
  };

  const handleEditTasting = (tasting: Tasting) => {
    setSelectedTasting(tasting);
    setIsEditDialogOpen(true);
  };

  const handleSaveTasting = () => {
    setIsEditDialogOpen(false);
    fetchTastings(); // Refresh the list
  };

  // Infinite scroll hook
  const loadMoreRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore: hasMore && !isSearching, // Disable infinite scroll when searching
    onLoadMore: () => fetchTastings(true),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        {/* Pending wines banner */}
        {pendingWinesCount > 0 && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-50/10">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="ml-2">
              <strong>
                {pendingWinesCount} wine{pendingWinesCount > 1 ? "s" : ""}
              </strong>{" "}
              {pendingWinesCount > 1 ? "are" : "is"} being processed. Your
              journal will update automatically when ready.
            </AlertDescription>
          </Alert>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Your Wine Journey
          </h1>
          <p className="text-muted-foreground">
            Track your tastings, discover new wines, and learn about terroir
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/scan">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Scan a Wine</h3>
                    <p className="text-sm text-muted-foreground">
                      Add to your collection
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/map">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Explore Regions</h3>
                    <p className="text-sm text-muted-foreground">
                      Learn about terroir
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content Area */}
        <Tabs defaultValue="tastings" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2">
              <TabsTrigger value="tastings">Tastings</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>
            <SearchBar
              onResults={(results) => {
                setIsSearching(true);
                // Map search results to Tasting format
                const mappedResults = results.map((r: any) => ({
                  id: r.tasting_id,
                  verdict: r.verdict,
                  notes: r.notes,
                  detailed_notes: null,
                  tasted_at: new Date().toISOString().split("T")[0], // Placeholder
                  location_name: r.location_name,
                  vintage: {
                    id: "search-result",
                    year: r.vintage_year,
                    wine: {
                      name: r.wine_name || "Unknown Wine",
                      producer: {
                        name: r.producer_name || "Unknown Producer",
                      },
                    },
                  },
                }));
                setFilteredTastings(mappedResults);
              }}
              onClear={() => {
                setIsSearching(false);
                setFilteredTastings([]);
              }}
            />
          </div>

          <TabsContent value="tastings" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (isSearching ? filteredTastings : tastings).length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isSearching ? filteredTastings : tastings).map(
                    (tasting) => (
                      <TastingCard
                        key={tasting.id}
                        tasting={tasting}
                        onEdit={handleEditTasting}
                      />
                    ),
                  )}
                </div>

                {/* Infinite scroll trigger */}
                {!isSearching && (
                  <div
                    ref={loadMoreRef}
                    className="flex justify-center p-4 mt-4"
                  >
                    {isLoadingMore && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Loading more wines...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold">
                        No Tastings Yet
                      </h2>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Scan your first wine label to start building your
                        tasting journal. Your ratings and notes will appear
                        here.
                      </p>
                    </div>
                    <Link href="/scan">
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Scan Your First Wine
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <SuggestionsTab tastings={tastings} supabase={supabase} />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Tasting Notes -{" "}
                {selectedTasting?.vintage.wine.producer.name}
              </DialogTitle>
            </DialogHeader>
            {selectedTasting && (
              <TastingNoteForm
                tastingId={selectedTasting.id}
                vintageId={selectedTasting.vintage.id}
                initialRating={selectedTasting.verdict || 0}
                initialNotes={selectedTasting.notes || ""}
                initialDetailedNotes={selectedTasting.detailed_notes || ""}
                initialLocationName={selectedTasting.location_name || ""}
                initialLocationAddress={selectedTasting.location_address || ""}
                initialLocationCity={selectedTasting.location_city || ""}
                initialLocationLat={selectedTasting.location_latitude}
                initialLocationLng={selectedTasting.location_longitude}
                onSave={handleSaveTasting}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Educational Tip */}
        <Card className="mt-8 bg-accent/20 border-accent/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wine className="h-5 w-5 text-primary" />
              Wine Tip of the Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-accent-foreground">
              <strong>Tasting Tip:</strong> Professional sommeliers often use
              the "5 S's" when tasting wine: See (observe color), Swirl (release
              aromas), Sniff (identify scents), Sip (taste), and Savor (evaluate
              the finish). Take your time with each step to fully appreciate the
              wine's complexity.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
