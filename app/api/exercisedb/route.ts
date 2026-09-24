import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const path = (q.get("path") ?? "").replace(/^\/+/, "");
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 500 });

  const passthrough = new URLSearchParams();
  q.forEach((v, k) => {
    if (k !== "path") passthrough.set(k, v);
  });
  const qs = passthrough.toString();
  const url = `https://exercisedb.p.rapidapi.com/${path}${qs ? "?" + qs : ""}`;

  try {
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("content-type") ?? "application/json",
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}
