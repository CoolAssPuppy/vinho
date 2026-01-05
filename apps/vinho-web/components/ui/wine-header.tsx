import { cn } from "@/lib/utils";
import Image from "next/image";
import { Wine } from "lucide-react";

type HeaderSize = "small" | "medium" | "large";

interface WineHeaderProps {
  wineName: string;
  producer?: string | null;
  vintage?: number | null;
  region?: string | null;
  country?: string | null;
  wineType?: string | null;
  imageUrl?: string | null;
  showImage?: boolean;
  size?: HeaderSize;
  className?: string;
}

const sizeConfig = {
  small: {
    imageSize: 60,
    imageHeight: 78,
    titleClass: "text-title-sm",
    subtitleClass: "text-caption",
  },
  medium: {
    imageSize: 80,
    imageHeight: 104,
    titleClass: "text-title-md",
    subtitleClass: "text-body-sm",
  },
  large: {
    imageSize: 100,
    imageHeight: 130,
    titleClass: "text-title-lg",
    subtitleClass: "text-body-md",
  },
};

export function WineHeader({
  wineName,
  producer,
  vintage,
  region,
  country,
  wineType,
  imageUrl,
  showImage = true,
  size = "large",
  className,
}: WineHeaderProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn("flex gap-4", className)}>
      {showImage && (
        <div
          className="flex-shrink-0 overflow-hidden rounded-md bg-secondary"
          style={{
            width: config.imageSize,
            height: config.imageHeight,
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={wineName}
              width={config.imageSize}
              height={config.imageHeight}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Wine className="h-1/3 w-1/3 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className={cn(config.titleClass, "text-foreground line-clamp-2")}>
          {wineName}
        </h3>

        {producer && (
          <p className={cn(config.subtitleClass, "text-muted-foreground")}>
            {producer}
          </p>
        )}

        {(vintage || region) && (
          <div className="flex items-center gap-2 text-sm">
            {vintage && (
              <span className="text-label-md text-primary">{vintage}</span>
            )}
            {vintage && region && (
              <span className="text-muted-foreground">-</span>
            )}
            {region && <span className="text-caption">{region}</span>}
          </div>
        )}

        {wineType && (
          <span className="inline-flex self-start rounded-full bg-primary/15 px-2 py-0.5 text-caption text-primary">
            {wineType}
          </span>
        )}
      </div>
    </div>
  );
}

interface CompactWineHeaderProps {
  wineName: string;
  producer?: string | null;
  vintage?: number | null;
  rating?: number | null;
  imageUrl?: string | null;
  className?: string;
}

export function CompactWineHeader({
  wineName,
  producer,
  vintage,
  rating,
  imageUrl,
  className,
}: CompactWineHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-[52px] w-10 flex-shrink-0 overflow-hidden rounded-sm bg-secondary">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={wineName}
            width={40}
            height={52}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Wine className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-md text-foreground">{wineName}</span>
        <div className="flex items-center gap-1 text-caption">
          {producer && (
            <span className="truncate text-muted-foreground">{producer}</span>
          )}
          {vintage && (
            <span className="text-muted-foreground/70">({vintage})</span>
          )}
        </div>
      </div>

      {rating != null && (
        <div className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1">
          <span className="text-xs text-primary">&#9733;</span>
          <span className="text-label-md text-primary">{rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
