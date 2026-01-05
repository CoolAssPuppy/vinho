import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center space-y-2 rounded-lg bg-secondary p-4",
        className
      )}
    >
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <span className={cn("text-stat text-foreground", valueClassName)}>
        {value}
      </span>
      <span className="text-caption text-center">{label}</span>
    </div>
  );
}

interface CompactStatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function CompactStatCard({
  label,
  value,
  icon: Icon,
  className,
}: CompactStatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md bg-secondary px-3 py-2",
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <div className="flex flex-col">
        <span className="text-title-sm text-foreground">{value}</span>
        <span className="text-caption">{label}</span>
      </div>
    </div>
  );
}

interface StatsRowProps {
  stats: {
    label: string;
    value: string | number;
    icon?: LucideIcon;
  }[];
  className?: string;
}

export function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div className={cn("flex gap-4", className)}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          className="flex-1"
        />
      ))}
    </div>
  );
}

interface QuickStatsProps {
  rating?: number | null;
  reviews?: number | null;
  price?: number | null;
  currency?: string;
  className?: string;
}

export function QuickStats({
  rating,
  reviews,
  price,
  currency = "$",
  className,
}: QuickStatsProps) {
  const formatCount = (count: number): string => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    } else if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className={cn("flex gap-6", className)}>
      {rating != null && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <span className="text-xs text-primary">&#9733;</span>
            <span className="text-label-lg text-foreground">
              {rating.toFixed(1)}
            </span>
          </div>
          <span className="text-caption">Community Average</span>
        </div>
      )}
      {reviews != null && reviews > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-label-lg text-foreground">
            {formatCount(reviews)}
          </span>
          <span className="text-caption">Reviews</span>
        </div>
      )}
      {price != null && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-label-lg text-foreground">
            {currency}
            {Math.round(price)}
          </span>
          <span className="text-caption">Price</span>
        </div>
      )}
    </div>
  );
}
