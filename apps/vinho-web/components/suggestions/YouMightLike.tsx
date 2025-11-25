"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, Wine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface SimilarWine {
  wine_id: string;
  wine_name: string;
  producer_name: string;
  similarity: number;
  image_url?: string;
  region?: string;
  country?: string;
}

type RecommendationType = "personalized" | "your_favorites" | "none";

interface YouMightLikeProps {
  hasTastings: boolean;
}

export function YouMightLike({ hasTastings }: YouMightLikeProps) {
  const [wines, setWines] = useState<SimilarWine[]>([]);
  const [recommendationType, setRecommendationType] = useState<RecommendationType>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarWines = useCallback(async () => {
    if (!hasTastings) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wines/similar-for-user?limit=6");

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      const data = await response.json();
      setWines(data.similar_wines || []);
      setRecommendationType(data.recommendation_type || "none");
      setHasLoaded(true);
    } catch (err) {
      console.error("Error fetching similar wines:", err);
      setError("Unable to load recommendations");
    } finally {
      setIsLoading(false);
    }
  }, [hasTastings]);

  useEffect(() => {
    if (hasTastings && !hasLoaded) {
      fetchSimilarWines();
    }
  }, [hasTastings, hasLoaded, fetchSimilarWines]);

  if (!hasTastings) {
    return null;
  }

  const sectionTitle = recommendationType === "personalized"
    ? "You Might Like These"
    : "Similar to Your Favorites";

  const sectionSubtitle = recommendationType === "personalized"
    ? "Based on your top-rated wines"
    : "Based on visual similarity";

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">
              Finding wines you might like...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-8 border-destructive/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSimilarWines}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (wines.length === 0 && hasLoaded) {
    return (
      <Card className="mt-8 border-dashed">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/40" />
          <p className="text-muted-foreground">
            No visual matches found yet. As you add more wines, we&apos;ll find bottles
            with similar labels.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (wines.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{sectionTitle}</h3>
        <span className="text-sm text-muted-foreground">
          {sectionSubtitle}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {wines.map((wine) => (
          <WineCard key={wine.wine_id} wine={wine} />
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="ghost" size="sm" onClick={fetchSimilarWines}>
          Refresh suggestions
        </Button>
      </div>
    </div>
  );
}

function WineCard({ wine }: { wine: SimilarWine }) {
  const matchPercent = Math.round(wine.similarity * 100);

  return (
    <Card className="group hover:border-primary/50 transition-all overflow-hidden">
      <CardContent className="p-0">
        {wine.image_url ? (
          <div className="relative aspect-[3/4] bg-muted">
            <Image
              src={wine.image_url}
              alt={wine.wine_name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <WineInfo wine={wine} matchPercent={matchPercent} light />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="aspect-square max-w-[60px] mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wine className="h-6 w-6 text-primary" />
            </div>
            <WineInfo wine={wine} matchPercent={matchPercent} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WineInfoProps {
  wine: SimilarWine;
  matchPercent: number;
  light?: boolean;
}

function WineInfo({ wine, matchPercent, light }: WineInfoProps) {
  const textColor = light ? "text-white" : "text-foreground";
  const mutedColor = light ? "text-white/70" : "text-muted-foreground";

  return (
    <div className="space-y-1">
      <p className={`font-medium text-sm line-clamp-2 ${textColor}`}>
        {wine.wine_name}
      </p>
      <p className={`text-xs ${mutedColor}`}>{wine.producer_name}</p>
      {wine.region && (
        <p className={`text-xs ${mutedColor}`}>
          {wine.region}
          {wine.country && `, ${wine.country}`}
        </p>
      )}
      <div className="flex items-center gap-1 pt-1">
        <span
          className={`text-xs font-medium ${
            matchPercent >= 80
              ? "text-green-500"
              : matchPercent >= 60
                ? "text-yellow-500"
                : "text-orange-500"
          }`}
        >
          {matchPercent}% match
        </span>
      </div>
    </div>
  );
}
