// Self-serve account deletion. Requires the Supabase service-role key (server-only,
// never exposed to the client) because deleting an auth user is an admin operation
// the anon/publishable key cannot perform.
//
// Flow: the client sends its access token as a Bearer header. We verify it with the
// admin client to resolve the caller's user id, then:
//   1. delete their shared_plans rows (that FK is `on delete set null`, so it would
//      otherwise leave orphaned public links behind),
//   2. call auth.admin.deleteUser(id), which cascades every other owned row
//      (profiles, follows, activity, likes, comments, and all sync tables all use
//      `on delete cascade` on auth.users).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  if (!URL || !SERVICE_ROLE) {
    return NextResponse.json(
      { error: "Account deletion is not configured on the server." },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createClient(URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Resolve (and validate) the caller from their access token.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
  }

  // Shares use `on delete set null`, so remove them explicitly to retract links.
  await admin.from("shared_plans").delete().eq("owner", user.id);

  // Cascades profiles, follows, activity, likes, comments, and all sync tables.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({ error: "Couldn't delete the account. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
