import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-middleware";

/**
 * Protected routes that require authentication
 */
const PROTECTED_PATHS = [
  "/journal",
  "/scan",
  "/profile",
  "/sharing",
  "/map",
  "/discover",
  "/settings",
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/privacy",
  "/terms",
  "/support",
  "/invite",
  "/about",
];

/**
 * Check if a path matches any of the given prefixes
 */
function pathMatches(pathname: string, paths: string[]): boolean {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const { pathname } = request.nextUrl;

  // Refresh session if it exists (this also validates the session)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if accessing a protected route without authentication
  if (!user && pathMatches(pathname, PROTECTED_PATHS)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    // Preserve the intended destination
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth pages, redirect to journal
  if (user && pathname.startsWith("/auth") && pathname !== "/auth/callback") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/journal";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, etc.)
     * - API routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
