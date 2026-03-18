"use client";

import { useReducer, useRef, useCallback } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { createClient } from "@/lib/supabase";
import type { Tasting } from "@/lib/types/shared";

const PAGE_SIZE = 12;
const REALTIME_DEBOUNCE_MS = 2000;

interface JournalState {
  tastings: Tasting[];
  filteredTastings: Tasting[];
  isSearching: boolean;
  isLoading: boolean;
  selectedTasting: Tasting | null;
  isEditDialogOpen: boolean;
  pendingWinesCount: number;
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

type JournalAction =
  | { type: "SET_TASTINGS"; payload: Tasting[] }
  | { type: "APPEND_TASTINGS"; payload: Tasting[] }
  | { type: "SET_FILTERED_TASTINGS"; payload: Tasting[] }
  | { type: "SET_IS_SEARCHING"; payload: boolean }
  | { type: "SET_IS_LOADING"; payload: boolean }
  | { type: "SET_SELECTED_TASTING"; payload: Tasting | null }
  | { type: "SET_IS_EDIT_DIALOG_OPEN"; payload: boolean }
  | { type: "SET_PENDING_WINES_COUNT"; payload: number }
  | { type: "SET_PAGE"; payload: number }
  | { type: "INCREMENT_PAGE" }
  | { type: "SET_HAS_MORE"; payload: boolean }
  | { type: "SET_IS_LOADING_MORE"; payload: boolean }
  | { type: "REMOVE_TASTING"; payload: string }
  | { type: "UPDATE_TASTING"; payload: Tasting }
  | { type: "CLEAR_SEARCH" };

const initialState: JournalState = {
  tastings: [],
  filteredTastings: [],
  isSearching: false,
  isLoading: true,
  selectedTasting: null,
  isEditDialogOpen: false,
  pendingWinesCount: 0,
  page: 0,
  hasMore: true,
  isLoadingMore: false,
};

function journalReducer(state: JournalState, action: JournalAction): JournalState {
  switch (action.type) {
    case "SET_TASTINGS":
      return { ...state, tastings: action.payload };
    case "APPEND_TASTINGS":
      return { ...state, tastings: [...state.tastings, ...action.payload] };
    case "SET_FILTERED_TASTINGS":
      return { ...state, filteredTastings: action.payload };
    case "SET_IS_SEARCHING":
      return { ...state, isSearching: action.payload };
    case "SET_IS_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_SELECTED_TASTING":
      return { ...state, selectedTasting: action.payload };
    case "SET_IS_EDIT_DIALOG_OPEN":
      return { ...state, isEditDialogOpen: action.payload };
    case "SET_PENDING_WINES_COUNT":
      return { ...state, pendingWinesCount: action.payload };
    case "SET_PAGE":
      return { ...state, page: action.payload };
    case "INCREMENT_PAGE":
      return { ...state, page: state.page + 1 };
    case "SET_HAS_MORE":
      return { ...state, hasMore: action.payload };
    case "SET_IS_LOADING_MORE":
      return { ...state, isLoadingMore: action.payload };
    case "REMOVE_TASTING":
      return {
        ...state,
        tastings: state.tastings.filter((t) => t.id !== action.payload),
      };
    case "UPDATE_TASTING":
      return {
        ...state,
        tastings: state.tastings.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };
    case "CLEAR_SEARCH":
      return { ...state, isSearching: false, filteredTastings: [] };
    default:
      return state;
  }
}

export function useJournalTastings() {
  const [state, dispatch] = useReducer(journalReducer, initialState);
  const supabase = createClient();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTastings = useCallback(async (loadMore = false) => {
    if (!loadMore) {
      dispatch({ type: "SET_IS_LOADING", payload: true });
    } else {
      dispatch({ type: "SET_IS_LOADING_MORE", payload: true });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      dispatch({ type: "SET_IS_LOADING", payload: false });
      dispatch({ type: "SET_IS_LOADING_MORE", payload: false });
      return;
    }

    const from = loadMore ? state.page * PAGE_SIZE : 0;
    const to = from + PAGE_SIZE;

    const { data, error } = await supabase
      .from("tastings")
      .select(
        `
        id,
        verdict,
        notes,
        detailed_notes,
        tasted_at,
        location_name,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        image_url,
        vintage:vintage_id (
          id,
          year,
          community_rating,
          community_rating_count,
          wine:wine_id (
            id,
            name,
            tasting_notes,
            wine_type,
            varietal,
            style,
            serving_temperature,
            food_pairings,
            color,
            producer:producer_id (
              name
            )
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching tastings:", error);
    } else if (data) {
      const transformedData = (data
        .filter((item) => item.vintage !== null) as unknown) as Tasting[];

      dispatch({ type: "SET_HAS_MORE", payload: data.length === PAGE_SIZE + 1 });

      const itemsToShow =
        data.length > PAGE_SIZE
          ? transformedData.slice(0, PAGE_SIZE)
          : transformedData;

      if (loadMore) {
        dispatch({ type: "APPEND_TASTINGS", payload: itemsToShow });
        dispatch({ type: "INCREMENT_PAGE" });
      } else {
        dispatch({ type: "SET_TASTINGS", payload: itemsToShow });
        dispatch({ type: "SET_PAGE", payload: 1 });
      }
    }

    dispatch({ type: "SET_IS_LOADING", payload: false });
    dispatch({ type: "SET_IS_LOADING_MORE", payload: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.page]);

  const fetchPendingWines = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("wines_added_queue")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "working"]);

    if (!error && data) {
      dispatch({ type: "SET_PENDING_WINES_COUNT", payload: data.length });
    } else {
      dispatch({ type: "SET_PENDING_WINES_COUNT", payload: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up initial data fetch and debounced realtime subscription
  useMountEffect(() => {
    const setupData = async () => {
      await fetchTastings();
      await fetchPendingWines();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("wines_added_queue_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wines_added_queue",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Debounce: batch rapid updates during bulk imports
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              fetchPendingWines();
              fetchTastings();
            }, REALTIME_DEBOUNCE_MS);
          },
        )
        .subscribe();

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        supabase.removeChannel(channel);
      };
    };

    setupData();
  });

  const handleEditTasting = useCallback((tasting: Tasting) => {
    dispatch({ type: "SET_SELECTED_TASTING", payload: tasting });
    dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: true });
  }, []);

  const handleSaveTasting = useCallback((updatedTasting?: Tasting) => {
    dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: false });
    if (updatedTasting) {
      dispatch({ type: "UPDATE_TASTING", payload: updatedTasting });
    } else {
      // Fallback: refetch if no optimistic data provided
      fetchTastings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteTasting = useCallback(async (tastingId: string) => {
    const { error } = await supabase
      .from("tastings")
      .delete()
      .eq("id", tastingId);

    if (!error) {
      dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: false });
      dispatch({ type: "REMOVE_TASTING", payload: tastingId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSearchResults = useCallback((tastings: Tasting[]) => {
    dispatch({ type: "SET_IS_SEARCHING", payload: true });
    dispatch({ type: "SET_FILTERED_TASTINGS", payload: tastings });
  }, []);

  const clearSearch = useCallback(() => {
    dispatch({ type: "CLEAR_SEARCH" });
  }, []);

  const setEditDialogOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_IS_EDIT_DIALOG_OPEN", payload: open });
  }, []);

  return {
    ...state,
    fetchTastings,
    handleEditTasting,
    handleSaveTasting,
    handleDeleteTasting,
    setSearchResults,
    clearSearch,
    setEditDialogOpen,
    PAGE_SIZE,
  };
}
