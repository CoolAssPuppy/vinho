import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { getCorsHeaders, handleCorsPreFlight } from "../../shared/security.ts";
import { getErrorMessage } from "../../shared/errors.ts";

Deno.serve(async (request: Request) => {
  const preflight = handleCorsPreFlight(request);
  if (preflight) return preflight;

  const origin = request.headers.get("Origin");
  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse({ error: "Authentication required" }, 401, origin);

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Authentication required" }, 401, origin);
    }

    const userId = authData.user.id;
    const [profile, tastings, scans, photos, queue, preferences, sharing] = await Promise.all([
      client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      client.from("tastings").select("*").eq("user_id", userId),
      client.from("scans").select("*").eq("user_id", userId),
      client.from("photos").select("*").eq("user_id", userId),
      client.from("wines_added_queue").select("*").eq("user_id", userId),
      client.from("user_sharing_preferences").select("*").eq("user_id", userId).maybeSingle(),
      client.from("sharing_connections").select("*")
        .or(`sharer_id.eq.${userId},viewer_id.eq.${userId}`),
    ]);

    const firstError = [profile, tastings, scans, photos, queue, preferences, sharing]
      .map((result) => result.error)
      .find(Boolean);
    if (firstError) throw firstError;

    return jsonResponse({
      export_version: 1,
      generated_at: new Date().toISOString(),
      user: {
        id: userId,
        email: authData.user.email ?? null,
        created_at: authData.user.created_at,
      },
      profile: profile.data,
      tastings: tastings.data ?? [],
      scans: scans.data ?? [],
      photos: photos.data ?? [],
      wine_processing: queue.data ?? [],
      sharing_preferences: preferences.data,
      sharing_connections: sharing.data ?? [],
    }, 200, origin, true);
  } catch (error) {
    console.error("User data export failed:", getErrorMessage(error));
    return jsonResponse({ error: "Unable to export account data" }, 500, origin);
  }
});

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  isDownload: boolean = false,
): Response {
  const headers: Record<string, string> = {
    ...getCorsHeaders(origin),
    "Content-Type": "application/json; charset=utf-8",
  };
  if (isDownload) headers["Content-Disposition"] = 'attachment; filename="vinho-data.json"';
  return new Response(JSON.stringify(body, null, 2), { status, headers });
}
