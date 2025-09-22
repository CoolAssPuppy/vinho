"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

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

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  types,
}: PlaceAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  interface Suggestion {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
    };
  }
  const [results, setResults] = useState<Suggestion[]>([]);
  const debounced = useDebounce(query, 300);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(
      `/api/places/autocomplete?input=${encodeURIComponent(debounced)}${types ? `&types=${types}` : ""}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((d) => setResults((d.data as Suggestion[]) || []))
      .catch(() => {});
    return () => controller.abort();
  }, [debounced, types]);

  const handleSelect = useCallback(
    async (placeId: string, primaryText: string) => {
      setOpen(false);
      onChange(primaryText);
      setQuery(primaryText);
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

        onSelect({
          name: data.displayName?.text || primaryText,
          address: data.formattedAddress || "",
          city,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
        });
      } catch {
        onSelect({ name: primaryText, address: "" });
      }
    },
    [onChange, onSelect],
  );

  return (
    <Command shouldFilter={false} className="overflow-visible">
      <div className="flex w-full items-center justify-between rounded-lg border bg-background text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          className="w-full border-0 focus-visible:ring-0"
        />
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
