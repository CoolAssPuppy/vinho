/**
 * Authentication validation utilities
 * Provides email and password validation with consistent error messages
 */

// Email validation regex (RFC 5322 compliant)
export const EMAIL_REGEX = /^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates an email address format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { isValid: false, error: "Email is required" };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
}

/**
 * Validates password against security requirements
 * Requirements: 8+ characters, uppercase, lowercase, number
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be less than ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain a lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain an uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain a number");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates that two passwords match
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }
  return { isValid: true };
}

/**
 * Validates a required text field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Maps Supabase auth error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: { message: string; code?: string }): string {
  const errorMap: Record<string, string> = {
    "Invalid login credentials": "Invalid email or password. Please try again.",
    "Email not confirmed": "Please verify your email before signing in.",
    "User already registered": "An account with this email already exists.",
    "Password should be at least 6 characters": "Password must be at least 8 characters with uppercase, lowercase, and a number.",
    "captcha_failed": "Captcha verification failed. Please try again.",
    "captcha_expired": "Captcha has expired. Please verify again.",
  };

  return errorMap[error.message] || error.message;
}
