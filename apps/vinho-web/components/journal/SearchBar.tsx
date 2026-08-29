"use client";

import { useCallback, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useMountEffect } from "@/hooks/use-mount-effect";

const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const SEARCH_CACHE_MAX_SIZE = 20;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

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

function useJournalSearch(
  onResults?: (results: SearchResult[]) => void,
  onClear?: () => void,
) {
  const [isSearching, setIsSearching] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry<SearchResult[]>>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: string) => {
      const cacheKey = query.trim().toLowerCase();
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
        onResults?.(cached.data);
        return;
      }

      setIsSearching(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const response = await fetch(
          `/api/search/tastings?q=${encodeURIComponent(query)}`,
          { signal: abortRef.current.signal },
        );
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];

          if (cacheRef.current.size >= SEARCH_CACHE_MAX_SIZE) {
            const oldest = [...cacheRef.current.entries()]
              .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) cacheRef.current.delete(oldest[0]);
          }
          cacheRef.current.set(cacheKey, { data: results, timestamp: Date.now() });

          onResults?.(results);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search failed:", error);
          onResults?.([]);
        }
      } finally {
        setIsSearching(false);
      }
  }, [onResults]);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      abortRef.current?.abort();
      setIsSearching(false);
      onClear?.();
      return;
    }
    timerRef.current = setTimeout(() => void performSearch(query), 500);
  }, [onClear, performSearch]);

  useMountEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  });

  return { isSearching, search };
}

export function SearchBar({ onResults, onClear }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const { isSearching, search } = useJournalSearch(onResults, onClear);

  const handleClear = () => {
    setQuery("");
    search("");
  };

  return (
    <div className="relative max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
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
