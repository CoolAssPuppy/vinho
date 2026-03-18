import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useDebounce } from "@/hooks/use-debounce";
import type { WineLocation, RecentWine, WineStats } from "@/lib/types/shared";

type MapView = "origins" | "tastings";

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface UseMapDataOptions {
  mapView: MapView;
  mapBounds: MapBounds | null;
}

export function useMapData({ mapView, mapBounds }: UseMapDataOptions) {
  const [wines, setWines] = useState<WineLocation[]>([]);
  const [recentWines, setRecentWines] = useState<RecentWine[]>([]);
  const [stats, setStats] = useState<WineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasWines, setHasWines] = useState(false);
  const debouncedBounds = useDebounce(mapBounds, 500);
  const hasInitialLoad = useRef(false);

  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: statsData } = await supabase
        .from("user_wine_stats")
        .select("*")
        .single();

      if (statsData) {
        setStats(statsData as WineStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [supabase]);

  const fetchRecentWines = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: recentData } = await supabase
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
          vintage:vintages (
            id,
            year,
            abv,
            wine:wines (
              name,
              producer:producers (
                name,
                region:regions (
                  name,
                  country
                )
              )
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .order("tasted_at", { ascending: false })
        .limit(10);

      if (recentData) {
        const formattedRecent: RecentWine[] = recentData.map((tasting) => ({
          id: tasting.id,
          wine_name: tasting.vintage?.wine?.name || "Unknown Wine",
          producer_name:
            tasting.vintage?.wine?.producer?.name || "Unknown Producer",
          region: tasting.vintage?.wine?.producer?.region?.name || "",
          country: tasting.vintage?.wine?.producer?.region?.country || "",
          vintage_year: tasting.vintage?.year,
          vintage_id: tasting.vintage?.id,
          abv: tasting.vintage?.abv,
          rating: tasting.verdict,
          tasted_at: tasting.tasted_at || null,
          location_name: tasting.location_name,
          location_address: tasting.location_address,
          location_city: tasting.location_city,
          location_latitude: tasting.location_latitude,
          location_longitude: tasting.location_longitude,
          notes: tasting.notes,
          detailed_notes: tasting.detailed_notes,
        }));

        setRecentWines(formattedRecent);
      }
    } catch (error) {
      console.error("Error fetching recent wines:", error);
    }
  }, [supabase]);

  const fetchWinesInBounds = useCallback(
    async (bounds: MapBounds | null) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tastings, error } = await supabase
          .from("tastings")
          .select(
            `
            id,
            tasted_at,
            location_name,
            location_address,
            location_city,
            location_latitude,
            location_longitude,
            vintage:vintages (
              year,
              wine:wines (
                id,
                name,
                producer:producers (
                  id,
                  name,
                  address,
                  city,
                  postal_code,
                  website,
                  latitude,
                  longitude,
                  region:regions (
                    name,
                    country
                  )
                )
              )
            )
          `,
          )
          .eq("user_id", user.id)
          .order("tasted_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("Error fetching wines:", error.message || error);
          setLoading(false);
          return;
        }

        if (!tastings || tastings.length === 0) {
          setWines([]);
          setHasWines(false);
          setLoading(false);
          return;
        }

        const locations: WineLocation[] = [];

        for (const tasting of tastings) {
          if (tasting.vintage?.wine?.producer) {
            const producer = tasting.vintage.wine.producer;
            const region = producer.region?.name || "";
            const country = producer.region?.country || "";

            const originLat = producer.latitude;
            const originLng = producer.longitude;

            const tastingLat = tasting.location_latitude || originLat;
            const tastingLng = tasting.location_longitude || originLng;

            locations.push({
              id: tasting.id,
              name: tasting.vintage.wine.name,
              producer: producer.name,
              producer_address: producer.address,
              producer_city: producer.city,
              producer_website: producer.website,
              region,
              country,
              year: tasting.vintage.year,
              varietals: [],
              latitude: mapView === "origins" ? originLat : tastingLat,
              longitude: mapView === "origins" ? originLng : tastingLng,
              vineyard_name: null,
              tasted_location:
                mapView === "tastings"
                  ? tasting.location_name || tasting.location_city || null
                  : null,
              tasted_date: tasting.tasted_at
                ? new Date(tasting.tasted_at)
                : undefined,
            });
          }
        }

        const validLocations = locations.filter(
          (w) => w.latitude && w.longitude,
        );

        setHasWines(validLocations.length > 0);

        let filtered = validLocations;
        if (bounds && hasInitialLoad.current) {
          filtered = validLocations.filter((wine) => {
            return (
              wine.latitude! >= bounds.south &&
              wine.latitude! <= bounds.north &&
              wine.longitude! >= bounds.west &&
              wine.longitude! <= bounds.east
            );
          });
        }

        setWines(filtered.slice(0, 20));
        setLoading(false);

        if (!hasInitialLoad.current) {
          hasInitialLoad.current = true;
        }
      } catch (error) {
        console.error("Error in fetchWinesInBounds:", error);
        setLoading(false);
      }
    },
    [supabase, mapView],
  );

  // Initial load
  useEffect(() => {
    fetchWinesInBounds(null);
    fetchStats();
    fetchRecentWines();
  }, [fetchWinesInBounds, fetchStats, fetchRecentWines]);

  // Handle bounds changes
  useEffect(() => {
    if (debouncedBounds && hasInitialLoad.current) {
      fetchWinesInBounds(debouncedBounds);
    }
  }, [debouncedBounds, fetchWinesInBounds]);

  // Handle view mode changes
  useEffect(() => {
    if (hasInitialLoad.current) {
      fetchWinesInBounds(mapBounds);
    }
  }, [mapView, mapBounds, fetchWinesInBounds]);

  return {
    wines,
    recentWines,
    stats,
    loading,
    hasWines,
    debouncedBounds,
    fetchWinesInBounds,
    fetchStats,
    fetchRecentWines,
  };
}
