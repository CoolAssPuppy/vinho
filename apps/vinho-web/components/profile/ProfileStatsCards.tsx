import { Wine, BookOpen, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileStats {
  wines: number;
  notes: number;
  regions: number;
  favorites: number;
}

interface ProfileStatsCardsProps {
  stats: ProfileStats;
}

export function ProfileStatsCards({ stats }: ProfileStatsCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card className="bg-vino-dark-secondary border-vino-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wine className="h-5 w-5 text-vino-accent" />
            <span className="text-3xl font-bold text-vino-text">
              {stats.wines}
            </span>
          </div>
          <p className="text-sm text-vino-text-secondary">Unique Wines</p>
        </CardContent>
      </Card>
      <Card className="bg-vino-dark-secondary border-vino-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-vino-accent" />
            <span className="text-3xl font-bold text-vino-text">
              {stats.notes}
            </span>
          </div>
          <p className="text-sm text-vino-text-secondary">Tasting Notes</p>
        </CardContent>
      </Card>
      <Card className="bg-vino-dark-secondary border-vino-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-vino-accent" />
            <span className="text-3xl font-bold text-vino-text">
              {stats.regions}
            </span>
          </div>
          <p className="text-sm text-vino-text-secondary">Regions Explored</p>
        </CardContent>
      </Card>
      <Card className="bg-vino-dark-secondary border-vino-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wine className="h-5 w-5 text-red-500" />
            <span className="text-3xl font-bold text-vino-text">
              {stats.favorites}
            </span>
          </div>
          <p className="text-sm text-vino-text-secondary">Favorites</p>
        </CardContent>
      </Card>
    </div>
  );
}
