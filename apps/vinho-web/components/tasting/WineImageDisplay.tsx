"use client";

import Image from "next/image";
import type { WineImageDisplayProps } from "./types";

export function WineImageDisplay({
  imageUrl,
  alt = "Wine bottle",
}: WineImageDisplayProps) {
  if (!imageUrl) return null;

  return (
    <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}
