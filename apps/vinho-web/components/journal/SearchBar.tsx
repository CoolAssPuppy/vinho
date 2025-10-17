"use client";

import { useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  tasting_id: string;
  wine_name: string;
  producer_name: string;
  vintage_year: number | null;
  verdict: number;
  location_name: string | null;
  notes: string | null;
  similarity?: number;
}

interface SearchBarProps {
  onResults?: (results: SearchResult[]) => void;
  onClear?: () => void;
}

export function SearchBar({ onResults, onClear }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        onClear?.();
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/search/tastings?q=${encodeURIComponent(debouncedQuery)}`,
        );
        if (response.ok) {
          const data = await response.json();
          onResults?.(data.results || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
        onResults?.([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]); // Only depend on debouncedQuery, not the callbacks

  const handleClear = () => {
    setQuery("");
    onClear?.();
  };

  return (
    <div className="relative max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for anything"
          className="w-full pl-10 pr-10 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
