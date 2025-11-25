/**
 * Shared security utilities for Edge Functions
 */

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "https://www.vinho.dev",
  "https://vinho.dev",
  "http://localhost:3000",
  "http://localhost:3001",
];

/**
 * Get CORS headers with origin validation
 * Only allows requests from whitelisted origins
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // Default to production origin

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response("ok", {
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}

/**
 * Check if the request is using the service role key (internal/cron calls)
 * This verifies that the caller is an internal service, not an end user
 */
export function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Direct comparison with service role key
  if (token === serviceRoleKey) return true;

  // Also check if this is a cron job (Supabase cron uses service role)
  // The service role JWT has role: "service_role" in its payload
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      return payload.role === "service_role";
    }
  } catch {
    // Not a valid JWT, not a service role request
  }

  return false;
}

/**
 * Verify that a request is authorized for internal-only endpoints
 * Returns an error Response if unauthorized, null if authorized
 */
export function verifyInternalRequest(req: Request): Response | null {
  if (!isServiceRoleRequest(req)) {
    const origin = req.headers.get("Origin");
    return new Response(
      JSON.stringify({ error: "Unauthorized - internal use only" }),
      {
        status: 401,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
  return null;
}

/**
 * Verify admin key for administrative endpoints
 * Returns an error Response if unauthorized, null if authorized
 */
export function verifyAdminRequest(req: Request, envKeyName: string = "CLEANUP_ADMIN_KEY"): Response | null {
  const adminKey = Deno.env.get(envKeyName);
  const origin = req.headers.get("Origin");

  // Admin key must be configured
  if (!adminKey) {
    console.error(`${envKeyName} environment variable not configured`);
    return new Response(
      JSON.stringify({ error: "Service not configured" }),
      {
        status: 503,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }

  const authHeader = req.headers.get("Authorization");

  if (authHeader !== `Bearer ${adminKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }

  return null;
}

/**
 * Validate image URL to prevent SSRF attacks
 * Only allows HTTPS URLs from trusted domains
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== "https:") {
      console.log(`Rejected non-HTTPS URL: ${url}`);
      return false;
    }

    // Block internal/private IPs and localhost
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "10.",
      "172.16.",
      "172.17.",
      "172.18.",
      "172.19.",
      "172.20.",
      "172.21.",
      "172.22.",
      "172.23.",
      "172.24.",
      "172.25.",
      "172.26.",
      "172.27.",
      "172.28.",
      "172.29.",
      "172.30.",
      "172.31.",
      "192.168.",
      "169.254.",
      "fc00:",
      "fe80:",
      "::1",
      "metadata.google",
      "169.254.169.254", // Cloud metadata endpoints
    ];

    if (blockedPatterns.some(p => hostname.includes(p))) {
      console.log(`Rejected blocked hostname: ${hostname}`);
      return false;
    }

    // Allow trusted domains for image storage
    const trustedDomains = [
      ".supabase.co",
      ".supabase.in",
      ".supabase.net",
      "aghiopwrzzvamssgcwpv.supabase.co", // Your Supabase project
    ];

    if (!trustedDomains.some(d => hostname.endsWith(d) || hostname === d.replace(".", ""))) {
      console.log(`Rejected untrusted domain: ${hostname}`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`Invalid URL: ${url}`, error);
    return false;
  }
}

/**
 * HTML-escape user-provided content to prevent XSS in emails
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  origin: string | null = null
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse(
  data: Record<string, unknown>,
  origin: string | null = null
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
        "Connection": "keep-alive",
      },
    }
  );
}
