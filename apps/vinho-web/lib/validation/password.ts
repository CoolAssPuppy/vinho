/**
 * Password strength calculation utilities
 * Provides scoring and visual feedback for password strength
 */

export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
  score: number; // 0-4
  level: PasswordStrengthLevel;
  label: string;
  color: string;
  percentage: number;
}

/**
 * Calculates password strength score (0-4)
 * +1 for length >= 8
 * +1 for lowercase letter
 * +1 for uppercase letter
 * +1 for number
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;

  const levelMap: Record<number, { level: PasswordStrengthLevel; label: string; color: string }> = {
    0: { level: "weak", label: "Weak", color: "rgb(239, 68, 68)" }, // red-500
    1: { level: "weak", label: "Weak", color: "rgb(239, 68, 68)" }, // red-500
    2: { level: "fair", label: "Fair", color: "rgb(249, 115, 22)" }, // orange-500
    3: { level: "good", label: "Good", color: "rgb(234, 179, 8)" }, // yellow-500
    4: { level: "strong", label: "Strong", color: "rgb(34, 197, 94)" }, // green-500
  };

  const { level, label, color } = levelMap[score];

  return {
    score,
    level,
    label,
    color,
    percentage: (score / 4) * 100,
  };
}

/**
 * Returns the requirements that are met/unmet for a password
 */
export function getPasswordRequirements(password: string): {
  requirement: string;
  met: boolean;
}[] {
  return [
    {
      requirement: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      requirement: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      requirement: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      requirement: "One number",
      met: /[0-9]/.test(password),
    },
  ];
}
