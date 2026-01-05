"use client";

import { Edit, MapPin, Wine, Users, Star } from "lucide-react";
import Image from "next/image";
import { StarDisplay } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import type { Tasting } from "@/lib/types/shared";

interface TastingCardProps {
  tasting: Tasting;
  onEdit?: (tasting: Tasting) => void;
}

export function TastingCard({ tasting, onEdit }: TastingCardProps) {
  const wineName = tasting.vintage.wine.name;
  const vintage = tasting.vintage.year;
  const producerName = tasting.vintage.wine.producer.name;
  const producerCity = tasting.vintage.wine.producer.city;
  const tastingLocation = tasting.location_name || tasting.location_city;
  const communityRating = tasting.vintage.community_rating;
  const communityRatingCount = tasting.vintage.community_rating_count;

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="flex">
        {/* Wine Image */}
        <div className="relative w-32 bg-gray-100 flex-shrink-0">
          {tasting.image_url ? (
            <Image
              src={tasting.image_url}
              alt={`${wineName} ${vintage || "NV"}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
              <Wine className="h-12 w-12 text-red-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                {/* Wine Name + Vintage as the main title */}
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">
                    {wineName} {vintage || "NV"}
                  </CardTitle>
                  {tasting.is_shared && tasting.sharer && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {tasting.sharer.first_name} {tasting.sharer.last_name}
                    </Badge>
                  )}
                </div>

                {/* Producer name as secondary info */}
                <CardDescription className="text-base">
                  {producerName}
                </CardDescription>

                {/* Producer city as tertiary info */}
                {producerCity && (
                  <CardDescription className="text-sm">
                    {producerCity}
                  </CardDescription>
                )}
              </div>

              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(tasting)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Rating</span>
                <StarDisplay rating={tasting.verdict} />
              </div>

              {/* Community Rating */}
              {communityRating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vinho Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{communityRating.toFixed(1)}</span>
                    {communityRatingCount && communityRatingCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({communityRatingCount})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {tasting.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm line-clamp-2">{tasting.notes}</p>
                </div>
              )}

              {tasting.detailed_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Technical Notes
                  </p>
                  <p className="text-sm line-clamp-2 font-mono">
                    {tasting.detailed_notes}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t space-y-1">
                {tastingLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {tastingLocation}
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground block">
                  Tasted on {tasting.tasted_at ? format(new Date(tasting.tasted_at), "MMM d, yyyy") : "Unknown"}
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
