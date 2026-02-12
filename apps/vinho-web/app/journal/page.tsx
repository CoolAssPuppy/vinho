"use client";

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
import { TastingNoteForm } from "@/components/tasting/TastingNoteForm";
import { TastingCard } from "@/components/journal/TastingCard";
import { SearchBar } from "@/components/journal/SearchBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useJournalTastings } from "@/hooks/use-journal-tastings";
import { mapSearchResultsToTastings } from "@/lib/mappers/search-result-mapper";
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

export default function JournalPage() {
  const {
    tastings,
    filteredTastings,
    isSearching,
    isLoading,
    selectedTasting,
    isEditDialogOpen,
    pendingWinesCount,
    hasMore,
    isLoadingMore,
    fetchTastings,
    handleEditTasting,
    handleSaveTasting,
    handleDeleteTasting,
    setSearchResults,
    clearSearch,
    setEditDialogOpen,
  } = useJournalTastings();

  const loadMoreRef = useInfiniteScroll({
    loading: isLoadingMore,
    hasMore: hasMore && !isSearching,
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
                setSearchResults(mapSearchResultsToTastings(results));
              }}
              onClear={clearSearch}
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
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
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
                onDelete={() => handleDeleteTasting(selectedTasting.id)}
                onCancel={() => setEditDialogOpen(false)}
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
