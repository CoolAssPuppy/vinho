import { createServerSupabase } from "@/lib/supabase-server";
import { safeNext } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Signup confirmation lands on login; carry `next` through so an
      // invite (or other deep link) still completes after the user signs in.
      if (type === "signup") {
        const q = next === "/journal" ? "" : `&next=${encodeURIComponent(next)}`;
        return NextResponse.redirect(`${origin}/auth/login?verified=true${q}`);
      }
      // Redirect to the next page or journal after successful login
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`);
}
