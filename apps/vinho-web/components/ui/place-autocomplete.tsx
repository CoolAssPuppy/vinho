"use client";

import { useCallback, useRef, useState } from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { MapPin, CheckCircle } from "lucide-react";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PlaceAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (place: {
    name: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  types?: string;
}

interface Suggestion {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
  };
}

function usePlaceSuggestions(types?: string) {
  const [results, setResults] = useState<Suggestion[]>([]);
  const cacheRef = useRef<Map<string, CacheEntry<Suggestion[]>>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const cacheKey = `${query}|${types || ""}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setResults(cached.data);
      return;
    }

    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(query)}${types ? `&types=${types}` : ""}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((d) => {
          const suggestions = (d.data as Suggestion[]) || [];
          cacheRef.current.set(cacheKey, { data: suggestions, timestamp: Date.now() });
          setResults(suggestions);
        })
        .catch((error: unknown) => {
          if (!(error instanceof Error && error.name === "AbortError")) {
            console.error("Place autocomplete request failed:", error);
            setResults([]);
          }
        });
    }, 300);
  }, [types]);

  useMountEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  });

  return { results, search };
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  types,
}: PlaceAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address: string;
  } | null>(null);
  const { results, search } = usePlaceSuggestions(types);

  // Derive displayed place from value prop (Category B: no effect needed)
  const displayedPlace = value ? selectedPlace : null;

  const handleSelect = useCallback(
    async (placeId: string, primaryText: string) => {
      setOpen(false);
      setQuery(""); // Clear the query to stop searching
      search("");

      try {
        const res = await fetch(`/api/places/details?placeId=${placeId}`);
        const { data } = await res.json();

        // Extract city from address components or formatted address
        let city = "";
        if (data.shortFormattedAddress) {
          const parts = data.shortFormattedAddress.split(",");
          if (parts.length >= 2) {
            city = parts[parts.length - 2]?.trim() || "";
          }
        }

        const place = {
          name: data.displayName?.text || primaryText,
          address: data.formattedAddress || "",
          city,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
        };

        // Update both the display value and the selected place
        onChange(place.name);
        setSelectedPlace({ name: place.name, address: place.address });
        onSelect(place);
      } catch {
        const place = { name: primaryText, address: "" };
        onChange(primaryText);
        setSelectedPlace(place);
        onSelect(place);
      }
    },
    [onChange, onSelect, search],
  );

  return (
    <Command shouldFilter={false} className="overflow-visible">
      <div className="space-y-2">
        <div className="flex w-full items-center justify-between rounded-lg border bg-background text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          {displayedPlace && (
            <CheckCircle className="ml-3 h-4 w-4 text-green-500 flex-shrink-0" />
          )}
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setQuery(e.target.value);
              search(e.target.value);
              setSelectedPlace(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder={displayedPlace ? displayedPlace.name : placeholder}
            className="w-full border-0 focus-visible:ring-0"
          />
          {!displayedPlace && query && (
            <MapPin className="mr-3 h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {displayedPlace && displayedPlace.address && (
          <div className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-md">
            <MapPin className="inline h-3 w-3 mr-1" />
            {displayedPlace.address}
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <CommandList className="absolute z-50 mt-2 w-full rounded-md border bg-background shadow-md">
          <CommandGroup>
            {results.map((r) => {
              const placeId = r.placePrediction?.placeId;
              const primaryText = r.placePrediction?.text?.text || "";
              if (!placeId) return null;
              return (
                <CommandItem
                  key={placeId}
                  value={primaryText}
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => handleSelect(placeId, primaryText)}
                  className="cursor-pointer"
                >
                  {primaryText}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
}
