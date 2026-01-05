import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

export interface TastingWithSharing {
  id: string;
  user_id: string;
  vintage_id: string;
  verdict: number | null;
  notes: string | null;
  detailed_notes: string | null;
  tasted_at: string | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  is_shared: boolean;
  sharer_id: string | null;
  sharer_first_name: string | null;
  sharer_last_name: string | null;
}

export interface TastingFull {
  id: string;
  verdict: number | null;
  notes: string | null;
  detailed_notes: string | null;
  tasted_at: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  image_url: string | null;
  is_shared?: boolean;
  sharer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  vintage: {
    id: string;
    year: number | null;
    abv?: number | null;
    wine: {
      name: string;
      producer: {
        name: string;
        city?: string | null;
        region?: {
          name?: string;
          country?: string;
        } | null;
      } | null;
    } | null;
  } | null;
}

export function useTastings(limit: number = 100, offset: number = 0) {
  const [tastings, setTastings] = useState<TastingFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchTastings = useCallback(async (newLimit?: number, newOffset?: number) => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Use the RPC function to get tastings with sharing support
      const { data: tastingsWithSharing, error: rpcError } = await supabase.rpc('get_tastings_with_sharing', {
          p_limit: newLimit || limit,
          p_offset: newOffset || offset,
        });

      if (rpcError) throw rpcError;

      const tastingsArray = (tastingsWithSharing as TastingWithSharing[]) || [];

      if (!tastingsArray || tastingsArray.length === 0) {
        setTastings([]);
        setLoading(false);
        return;
      }

      // Get the tasting IDs
      const tastingIds = tastingsArray.map((t: TastingWithSharing) => t.id);

      // Fetch full tasting data with vintage/wine/producer information
      const { data: fullTastings, error: fetchError } = await supabase
        .from('tastings')
        .select(`
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
            abv,
            wine:wine_id (
              name,
              producer:producer_id (
                name,
                city,
                region:region_id (
                  name,
                  country
                )
              )
            )
          )
        `)
        .in('id', tastingIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Merge the sharing info with the full tasting data
      const mergedTastings: TastingFull[] = (fullTastings as unknown[]).map((tasting) => {
        const sharingInfo = tastingsArray.find((t: TastingWithSharing) => t.id === (tasting as TastingFull).id);
        return {
          ...(tasting as TastingFull),
          is_shared: sharingInfo?.is_shared || false,
          sharer: sharingInfo?.is_shared ? {
            id: sharingInfo.sharer_id!,
            first_name: sharingInfo.sharer_first_name,
            last_name: sharingInfo.sharer_last_name,
          } : null,
        };
      });

      setTastings(mergedTastings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tastings');
      console.error('Error fetching tastings:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, limit, offset]);

  useEffect(() => {
    fetchTastings();
  }, [fetchTastings]);

  return {
    tastings,
    loading,
    error,
    refresh: fetchTastings,
  };
}
