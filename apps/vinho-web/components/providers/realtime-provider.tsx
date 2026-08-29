"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMountEffect } from "@/hooks/use-mount-effect";

function useWineQueueSubscription(
  currentUserId: string | null,
) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useMountEffect(() => {
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
  });
}

function WineQueueSubscription({ userId }: { userId: string }) {
  useWineQueueSubscription(userId);
  return null;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

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

  return (
    <>
      {currentUserId && (
        <WineQueueSubscription key={currentUserId} userId={currentUserId} />
      )}
      {children}
    </>
  );
}
