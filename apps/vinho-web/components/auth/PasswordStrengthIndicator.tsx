"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import {
  calculatePasswordStrength,
  getPasswordRequirements,
} from "@/lib/validation/password";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  /** The password to evaluate */
  password: string;
  /** Whether to show the detailed requirements list */
  showRequirements?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Visual password strength indicator with progress bar
 * Shows real-time feedback as user types password
 */
export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );
  const requirements = useMemo(
    () => getPasswordRequirements(password),
    [password]
  );

  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">Password strength</span>
          <span
            className="font-medium"
            style={{ color: strength.color }}
          >
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${strength.percentage}%`,
              backgroundColor: strength.color,
            }}
          />
        </div>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <ul className="space-y-1 text-xs">
          {requirements.map(({ requirement, met }) => (
            <li
              key={requirement}
              className={cn(
                "flex items-center gap-2 transition-colors",
                met ? "text-green-400" : "text-white/50"
              )}
            >
              {met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {requirement}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
