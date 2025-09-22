import { Star } from "lucide-react";

interface StarDisplayProps {
  rating: number | null;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function StarDisplay({
  rating,
  size = "sm",
  showText = true,
}: StarDisplayProps) {
  if (!rating) {
    return showText ? (
      <span className="text-muted-foreground text-sm">Not rated</span>
    ) : null;
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
