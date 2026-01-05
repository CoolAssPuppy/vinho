"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export type OAuthProvider = "apple" | "google";

interface SocialButtonsProps {
  onSelect: (provider: OAuthProvider) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const providers: { id: OAuthProvider; label: string; icon: string }[] = [
  { id: "apple", label: "Sign in with Apple", icon: "/icons/apple.svg" },
  { id: "google", label: "Sign in with Google", icon: "/icons/google.svg" },
];

export function SocialButtons({ onSelect, disabled, loading, className }: SocialButtonsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          aria-label={provider.label}
          disabled={disabled || loading}
          onClick={() => onSelect(provider.id)}
          className={cn(
            "relative h-12 w-12 rounded-full transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
            (disabled || loading) && "opacity-60 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Image
              src={provider.icon}
              alt={provider.label}
              width={48}
              height={48}
              className="h-12 w-12"
            />
          )}
        </button>
      ))}
    </div>
  );
}
