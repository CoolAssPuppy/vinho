import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.VINHO_SERVICE_ROLE_KEY;

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.replace(/bearer /i, "");
    const supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    return supabase.auth.getUser();
  }

  const supabase = await createServerSupabase();
  return supabase.auth.getUser();
}

async function purgeUserData(admin: SupabaseClient<Database>, userId: string) {
  const errors: string[] = [];

  const deletions = [
    admin.from("photos").delete().eq("user_id", userId),
    admin.from("tastings").delete().eq("user_id", userId),
    admin.from("scans").delete().eq("user_id", userId),
    admin.from("restaurant_favorites").delete().eq("user_id", userId),
    admin.from("wines_added_queue").delete().eq("user_id", userId),
    admin.from("wines_enrichment_queue").delete().eq("user_id", userId),
    admin.from("user_sharing_preferences").delete().eq("user_id", userId),
    admin.from("sharing_connections").delete().or(`sharer_id.eq.${userId},viewer_id.eq.${userId}`),
    admin.from("profiles").delete().eq("id", userId),
  ];

  await Promise.all(
    deletions.map(async (query) => {
      const { error } = await query;
      if (error) errors.push(error.message);
    })
  );

  return errors;
}

export async function POST(request: NextRequest) {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const { data: authData, error: authError } = await getAuthenticatedUser(request);

  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = authData.user.id;

  const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

  const errors = await purgeUserData(admin, userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) errors.push(deleteError.message);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Unable to delete account completely", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId });
}
