"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { StarRatingProps } from "./types";

export function StarRating({
  rating,
  onRatingChange,
  size = "default",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = size === "large" ? "h-10 w-10" : "h-8 w-8";
  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`${starSize} ${
              star <= displayRating
                ? "fill-yellow-500 text-yellow-500"
                : "text-gray-300"
            } transition-colors`}
          />
        </button>
      ))}
      {size === "default" && (
        <span className="ml-4 text-lg font-medium">
          {rating > 0 ? `${rating} star${rating !== 1 ? "s" : ""}` : "Not rated"}
        </span>
      )}
    </div>
  );
}
