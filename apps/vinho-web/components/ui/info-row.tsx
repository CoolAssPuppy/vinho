import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InfoRowProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  valueClassName?: string;
  className?: string;
}

export function InfoRow({
  label,
  value,
  icon: Icon,
  valueClassName,
  className,
}: InfoRowProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-body-md text-muted-foreground">{label}</span>
      </div>
      <span className={cn("text-body-md text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}

export function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
  className,
}: DetailRowProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div className="flex flex-col">
        <span className="text-caption">{label}</span>
        <span className={cn("text-body-md text-foreground", valueClassName)}>
          {value}
        </span>
      </div>
    </div>
  );
}

interface MenuRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  iconClassName?: string;
  onClick?: () => void;
  className?: string;
}

export function MenuRow({
  icon: Icon,
  title,
  subtitle,
  showChevron = true,
  iconClassName,
  onClick,
  className,
}: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md py-3 text-left transition-colors hover:bg-secondary",
        className
      )}
    >
      <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
      <div className="flex flex-1 flex-col">
        <span className="text-body-md text-foreground">{title}</span>
        {subtitle && <span className="text-caption">{subtitle}</span>}
      </div>
      {showChevron && (
        <svg
          className="h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  );
}
