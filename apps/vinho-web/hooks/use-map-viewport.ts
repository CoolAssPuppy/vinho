import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "./use-debounce";

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface UseMapViewportOptions {
  onBoundsChange: (bounds: Bounds) => void;
  debounceMs?: number;
}

export function useMapViewport({
  onBoundsChange,
  debounceMs = 500,
}: UseMapViewportOptions) {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const debouncedBounds = useDebounce(bounds, debounceMs);

  useEffect(() => {
    if (debouncedBounds) {
      onBoundsChange(debouncedBounds);
    }
  }, [debouncedBounds]);

  const updateBounds = useCallback((newBounds: Bounds) => {
    setBounds(newBounds);
  }, []);

  return { updateBounds };
}
