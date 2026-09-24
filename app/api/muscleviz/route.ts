import { NextRequest, NextResponse } from "next/server";
import { buildMuscleVizUrl, MUSCLE_VIZ_HOST } from "@/lib/muscleviz";

// Streams the Muscle Visualizer workout image (a binary JPEG) via the RapidAPI proxy,
// keeping the key server-side. Mirrors app/api/edb/route.ts. Fixed jpeg/transparent/small
// per the plan cap; only muscles + gender vary. On upstream failure the original status is
// echoed so the client <img onError> hides the block gracefully.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const target = q.get("target") ?? "";
  const secondary = q.get("secondary") ?? "";
  const gender = q.get("gender") ?? "male";
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 500 });

  const url = buildMuscleVizUrl(target, secondary, gender);

  try {
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": MUSCLE_VIZ_HOST,
      },
    });
    if (!r.ok) {
      return new NextResponse(null, { status: r.status });
    }
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}
