"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMountEffect } from "@/hooks/use-mount-effect";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RealtimeContextType {
  // Add any realtime methods we might need
}

const RealtimeContext = createContext<RealtimeContextType>({});

function useWineQueueSubscription(
  currentUserId: string | null,
) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!currentUserId) return;

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
              "Wine analysis complete! Your collection has been updated.",
            );
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
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, currentUserId]);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createClient();

  useMountEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  });

  useWineQueueSubscription(currentUserId);

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
