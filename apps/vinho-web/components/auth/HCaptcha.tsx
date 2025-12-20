"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import HCaptchaLib from "@hcaptcha/react-hcaptcha";
import { cn } from "@/lib/utils";

export interface HCaptchaRef {
  /** Execute the captcha challenge */
  execute: () => void;
  /** Reset the captcha to initial state */
  reset: () => void;
}

interface HCaptchaProps {
  /** Callback when captcha is verified successfully */
  onVerify: (token: string) => void;
  /** Callback when captcha expires */
  onExpire?: () => void;
  /** Callback when captcha encounters an error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Size of the captcha widget */
  size?: "normal" | "compact" | "invisible";
  /** Theme of the captcha widget */
  theme?: "light" | "dark";
}

/**
 * HCaptcha component wrapper with Vinho styling
 * Provides bot protection for authentication forms
 */
const HCaptcha = forwardRef<HCaptchaRef, HCaptchaProps>(
  (
    {
      onVerify,
      onExpire,
      onError,
      className,
      size = "normal",
      theme = "dark",
    },
    ref
  ) => {
    const captchaRef = useRef<HCaptchaLib>(null);

    useImperativeHandle(ref, () => ({
      execute: () => {
        captchaRef.current?.execute();
      },
      reset: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

    if (!siteKey) {
      // In development, show a placeholder if no site key is configured
      if (process.env.NODE_ENV === "development") {
        return (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 p-4 text-sm text-white/60",
              className
            )}
          >
            HCaptcha disabled (no site key configured)
          </div>
        );
      }
      return null;
    }

    return (
      <div className={cn("flex justify-center", className)}>
        <HCaptchaLib
          ref={captchaRef}
          sitekey={siteKey}
          size={size}
          theme={theme}
          onVerify={onVerify}
          onExpire={() => {
            onExpire?.();
          }}
          onError={(error) => {
            onError?.(error);
          }}
        />
      </div>
    );
  }
);

HCaptcha.displayName = "HCaptcha";

export { HCaptcha };
