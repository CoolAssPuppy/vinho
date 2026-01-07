"use client";

import { useEffect, useReducer } from "react";
import {
  Wine,
  Camera,
  BookOpen,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogContentNoX } from "@/components/ui/dialog-no-x";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { TastingNoteForm } from "@/components/tasting/TastingNoteForm";
import { TastingCard } from "@/components/journal/TastingCard";
import { SearchBar } from "@/components/journal/SearchBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { Tasting } from "@/lib/types/shared";
import { YouMightLike } from "@/components/suggestions/YouMightLike";

type SuggestionsTabProps = {
  tastings: Tasting[];
};

function SuggestionsTab({ tastings }: SuggestionsTabProps) {
  return (
    <div className="space-y-6">
      <YouMightLike hasTastings={tastings.length > 0} />
    </div>
  );
}

// Journal page state type
interface JournalState {
  tastings: Tasting[];
  filteredTastings: Tasting[];
  isSearching: boolean;
  isLoading: boolean;
  selectedTasting: Tasting | null;
  isEditDialogOpen: boolean;
  pendingWinesCount: number;
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

// Action types for state transitions
type JournalAction =
  | { type: "SET_TASTINGS"; payload: Tasting[] }
  | { type: "APPEND_TASTINGS"; payload: Tasting[] }
  | { type: "SET_FILTERED_TASTINGS"; payload: Tasting[] }
  | { type: "SET_IS_SEARCHING"; payload: boolean }
  | { type: "SET_IS_LOADING"; payload: boolean }
  | { type: "SET_SELECTED_TASTING"; payload: Tasting | null }
  | { type: "SET_IS_EDIT_DIALOG_OPEN"; payload: boolean }
  | { type: "SET_PENDING_WINES_COUNT"; payload: number }
  | { type: "SET_PAGE"; payload: number }
  | { type: "INCREMENT_PAGE" }
  | { type: "SET_HAS_MORE"; payload: boolean }
  | { type: "SET_IS_LOADING_MORE"; payload: boolean }
  | { type: "REMOVE_TASTING"; payload: string }
  | { type: "CLEAR_SEARCH" };

const initialState: JournalState = {
  tastings: [],
  filteredTastings: [],
  isSearching: false,
  isLoading: true,
  selectedTasting: null,
  isEditDialogOpen: false,
  pendingWinesCount: 0,
  page: 0,
  hasMore: true,
  isLoadingMore: false,
};

function journalReducer(state: JournalState, action: JournalAction): JournalState {
  switch (action.type) {
    case "SET_TASTINGS":
      return { ...state, tastings: action.payload };
    case "APPEND_TASTINGS":
      return { ...state, tastings: [...state.tastings, ...action.payload] };
    case "SET_FILTERED_TASTINGS":
      return { ...state, filteredTastings: action.payload };
    case "SET_IS_SEARCHING":
      return { ...state, isSearching: action.payload };
    case "SET_IS_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_SELECTED_TASTING":
      return { ...state, selectedTasting: action.payload };
    case "SET_IS_EDIT_DIALOG_OPEN":
      return { ...state, isEditDialogOpen: action.payload };
    case "SET_PENDING_WINES_COUNT":
      return { ...state, pendingWinesCount: action.payload };
    case "SET_PAGE":
      return { ...state, page: action.payload };
    case "INCREMENT_PAGE":
      return { ...state, page: state.page + 1 };
    case "SET_HAS_MORE":
      return { ...state, hasMore: action.payload };
    case "SET_IS_LOADING_MORE":
      return { ...state, isLoadingMore: action.payload };
    case "REMOVE_TASTING":
      return {
        ...state,
        tastings: state.tastings.filter((t) => t.id !== action.payload),
      };
    case "CLEAR_SEARCH":
      return { ...state, isSearching: false, filteredTastings: [] };
    default:
      return state;
  }
}

export default function JournalPage() {
  const [state, dispatch] = useReducer(journalReducer, initialState);
  const {
    tastings,
    filteredTastings,
    isSearching,
    isLoading,
    selectedTasting,
    isEditDialogOpen,
    pendingWinesCount,
    page,
    hasMore,
    isLoadingMore,
  } = state;

  const PAGE_SIZE = 12;

  const supabase = createClient();

  const fetchTastings = async (loadMore = false) => {
    if (!loadMore) {
      dispatch({ type: "SET_IS_LOADING", payload: true });
    } else {
      dispatch({ type: "SET_IS_LOADING_MORE", payload: true });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      dispatch({ type: "SET_IS_LOADING", payload: false });
      dispatch({ type: "SET_IS_LOADING_MORE", payload: false });
      return;
    }

    const from = loadMore ? page * PAGE_SIZE : 0;
    const to = from + PAGE_SIZE; // Fetch one extra to check if there are more

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
          community_rating,
          community_rating_count,
          wine:wine_id (
            id,
            name,
            tasting_notes,
            wine_type,
            varietal,
            style,
            serving_temperature,
            food_pairings,
            color,
            producer:producer_id (
              name
            )
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching tastings:", error);
    } else if (data) {
      // Supabase automatically infers the nested type from the query
      const transformedData = (data
        .filter((item) => item.vintage !== null) as unknown) as Tasting[];

      // Set has more based on whether we got a full page
      dispatch({ type: "SET_HAS_MORE", payload: data.length === PAGE_SIZE + 1 });

      // Remove the extra item we fetched to check hasMore
      const itemsToShow =
        data.length > PAGE_SIZE
          ? transformedData.slice(0, PAGE_SIZE)
          : transformedData;

      if (loadMore) {
        dispatch({ type: "APPEND_TASTINGS", payload: itemsToShow });
        dispatch({ type: "INCREMENT_PAGE" });
      } else {
        dispatch({ type: "SET_TASTINGS", payload: itemsToShow });
        dispatch({ type: "SET_PAGE", payload: 1 });
      }
    }

    dispatch({ type: "SET_IS_LOADING", payload: false });
    dispatch({ type: "SET_IS_LOADING_MORE", payload: false });
  };

  useEffect(() => {
    const setupData = async () => {
      await fetchTastings();
      await fetchPendingWines();

      // Set up realtime subscription for wines_added_queue status changes
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("wines_added_queue_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wines_added_queue",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Refresh pending wines count when wines_added_queue changes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPendingWines = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("wines_added_queue")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "working"]);

    if (!error && data) {
      dispatch({ type: "SET_PENDING_WINES_COUNT", payload: data.length });
    } else {
      dispatch({ type: "SET_PENDING_WINES_COUNT", payload: 0 });
    }
  };

  const handleEditTasting = (tasting: Tasting) => {
    dispatch({ type: "SET_SELECTED_TASTING", payload: tasting });
    dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: true });
  };

  const handleSaveTasting = () => {
    dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: false });
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
                dispatch({ type: "SET_IS_SEARCHING", payload: true });
                // Map search results to Tasting format
                const mappedResults = results.map((r: {
                  tasting_id: string;
                  verdict: number | null;
                  notes: string | null;
                  location_name: string | null;
                  vintage_year: number | null;
                  wine_name: string | null;
                  producer_name: string | null;
                }) => ({
                  id: r.tasting_id,
                  verdict: r.verdict,
                  notes: r.notes,
                  detailed_notes: null,
                  tasted_at: new Date().toISOString().split("T")[0],
                  location_name: r.location_name,
                  location_address: null,
                  location_city: null,
                  location_latitude: null,
                  location_longitude: null,
                  image_url: null,
                  created_at: null,
                  updated_at: null,
                  user_id: null,
                  embedding: null,
                  search_text: null,
                  vintage: {
                    id: "search-result",
                    year: r.vintage_year,
                    created_at: null,
                    wine: {
                      id: "search-result-wine",
                      name: r.wine_name || "Unknown Wine",
                      tasting_notes: null,
                      created_at: null,
                      color: null,
                      food_pairings: null,
                      image_url: null,
                      is_nv: null,
                      serving_temperature: null,
                      style: null,
                      wine_type: null,
                      producer: {
                        id: "search-result-producer",
                        name: r.producer_name || "Unknown Producer",
                        address: null,
                        city: null,
                        created_at: null,
                        latitude: null,
                        longitude: null,
                        postal_code: null,
                        region_id: null,
                        website: null,
                      },
                    },
                  },
                } as Tasting));
                dispatch({ type: "SET_FILTERED_TASTINGS", payload: mappedResults });
              }}
              onClear={() => {
                dispatch({ type: "CLEAR_SEARCH" });
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
            <SuggestionsTab tastings={tastings} />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: open })}>
          <DialogContentNoX className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                initialTastedAt={selectedTasting.tasted_at ?? undefined}
                initialLocationName={selectedTasting.location_name || ""}
                initialLocationAddress={selectedTasting.location_address || ""}
                initialLocationCity={selectedTasting.location_city || ""}
                initialLocationLat={selectedTasting.location_latitude ?? undefined}
                initialLocationLng={selectedTasting.location_longitude ?? undefined}
                initialImageUrl={selectedTasting.image_url ?? undefined}
                wineId={selectedTasting.vintage.wine.id}
                wineName={selectedTasting.vintage.wine.name}
                wineDescription={selectedTasting.vintage.wine.tasting_notes ?? undefined}
                onSave={handleSaveTasting}
                onDelete={async () => {
                  if (selectedTasting) {
                    const { error } = await supabase
                      .from("tastings")
                      .delete()
                      .eq("id", selectedTasting.id);

                    if (!error) {
                      dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: false });
                      // Remove from local state
                      dispatch({ type: "REMOVE_TASTING", payload: selectedTasting.id });
                    }
                  }
                }}
                onCancel={() => dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: false })}
              />
            )}
          </DialogContentNoX>
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
              the &quot;5 S&apos;s&quot; when tasting wine: See (observe color), Swirl (release
              aromas), Sniff (identify scents), Sip (taste), and Savor (evaluate
              the finish). Take your time with each step to fully appreciate the
              wine&apos;s complexity.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
