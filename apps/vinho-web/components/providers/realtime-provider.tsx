"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Database } from "@/lib/database.types";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RealtimeContextType {
  // Add any realtime methods we might need
}

const RealtimeContext = createContext<RealtimeContextType>({});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to wine processing queue updates for current user only
    const channel = supabase
      .channel("global-wine-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wines_added_queue",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newData = payload.new as {
            status: string;
            wine_id?: string;
            user_id?: string;
          };

          if (newData.status === "completed") {
            toast.success(
              "🍷 Wine analysis complete! Your collection has been updated.",
            );

            // Refresh the current page to show new data
            router.refresh();
          } else if (newData.status === "failed") {
            toast.error(
              "Wine analysis failed. The entry has been saved for manual review.",
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wines",
        },
        () => {
          // When a new wine is added, refresh the page
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vintages",
        },
        () => {
          // When a new vintage is added, refresh the page
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, currentUserId]);

  return (
    <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}
