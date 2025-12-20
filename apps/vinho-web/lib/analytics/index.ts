/**
 * PostHog Analytics Module for Vinho Web
 *
 * Provides type-safe analytics tracking with production-only capture.
 * In development, events are logged to console instead of sent to PostHog.
 */

import posthog from "posthog-js";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  type LLMOperationProperties,
  type ErrorProperties,
} from "./events";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Capture an analytics event with optional properties.
 * In development, logs to console instead of sending to PostHog.
 */
export function capture(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): void {
  if (isDevelopment) {
    console.log("[PostHog Dev]", event, properties);
    return;
  }

  if (typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
}

/**
 * Identify a user with their unique ID and optional properties.
 * Call this after successful authentication.
 */
export function identifyUser(
  userId: string,
  properties?: {
    email?: string;
    name?: string;
    created_at?: string;
    [key: string]: unknown;
  }
): void {
  if (isDevelopment) {
    console.log("[PostHog Dev] identify", userId, properties);
    return;
  }

  if (typeof window !== "undefined") {
    posthog.identify(userId, properties);
  }
}

/**
 * Reset the current user identity.
 * Call this on logout to unlink future events from the user.
 */
export function resetUser(): void {
  if (isDevelopment) {
    console.log("[PostHog Dev] reset");
    return;
  }

  if (typeof window !== "undefined") {
    posthog.reset();
  }
}

/**
 * Track an LLM operation for AI observability.
 * Captures model, tokens, latency, and cost data.
 */
export function trackLLMOperation(properties: LLMOperationProperties): void {
  const event = properties.success
    ? ANALYTICS_EVENTS.LLM_OPERATION_COMPLETED
    : ANALYTICS_EVENTS.LLM_OPERATION_FAILED;

  capture(event, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Capture an error for error tracking.
 * Uses PostHog's $exception event format for proper error grouping.
 */
export function captureError(
  error: Error,
  context?: Omit<ErrorProperties, "error_message" | "error_stack" | "error_type">
): void {
  const properties: ErrorProperties = {
    error_message: error.message,
    error_stack: error.stack,
    error_type: error.name,
    ...context,
  };

  if (isDevelopment) {
    console.error("[PostHog Dev] Error captured:", properties);
    return;
  }

  if (typeof window !== "undefined") {
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_stack_trace_raw: error.stack,
      $exception_type: error.name,
      ...context,
    });
  }
}

/**
 * Set a user property that persists across events.
 * Use for properties that don't change often (e.g., subscription tier).
 */
export function setUserProperty(
  property: string,
  value: string | number | boolean
): void {
  if (isDevelopment) {
    console.log("[PostHog Dev] setUserProperty", property, value);
    return;
  }

  if (typeof window !== "undefined") {
    posthog.people.set({ [property]: value });
  }
}

/**
 * Get the current distinct ID for the user.
 * Useful for linking server-side events.
 */
export function getDistinctId(): string | undefined {
  if (typeof window !== "undefined") {
    return posthog.get_distinct_id();
  }
  return undefined;
}

// Re-export events for convenience
export { ANALYTICS_EVENTS } from "./events";
export type { AnalyticsEvent } from "./events";
