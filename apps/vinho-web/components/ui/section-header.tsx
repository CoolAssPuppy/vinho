import { cn } from "@/lib/utils";
import { Button } from "./button";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between", className)}>
      <div className="space-y-1">
        <h3 className="text-title-md text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-caption">{subtitle}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="link" size="sm" onClick={onAction} className="text-primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface SectionContainerProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SectionContainer({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  className,
}: SectionContainerProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        onAction={onAction}
      />
      {children}
    </section>
  );
}
