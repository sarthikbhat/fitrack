import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Daily keep-alive endpoint. A real Supabase query counts as DB activity, which
// prevents a free-tier project from auto-pausing after 7 idle days. Pinged by
// the Vercel cron (vercel.json) and a backup GitHub Actions workflow.
export async function GET(req: NextRequest) {
  // Auth guard: when CRON_SECRET is configured, require a matching bearer token.
  // When it is unset, allow the call (so it works before the secret is set) but
  // note it in the logs.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[keepalive] CRON_SECRET is unset - endpoint is unauthenticated");
  }

  const url = process.env.PUBLIC_SUPABASE_URL;
  // Accept either the legacy anon key or Supabase's newer publishable key name.
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, reason: "supabase not configured" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = createClient(url, anonKey);
    const { error } = await supabase.from("keepalive").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json(
      { ok: true, at: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
