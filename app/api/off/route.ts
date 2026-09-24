import { NextRequest, NextResponse } from "next/server";

// OpenFoodFacts search proxy. OFF requires a descriptive User-Agent, which
// browsers can't set on a cross-origin fetch — so the request is proxied here.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ products: [] });

  // Use the modern Search-a-licious service — the legacy cgi/search.pl and the
  // v2 search endpoint frequently return "Page temporarily unavailable".
  const params = new URLSearchParams({
    q,
    page_size: "25",
    fields: "code,product_name,brands,nutriments",
  });
  const url = "https://search.openfoodfacts.org/search?" + params.toString();

  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Fitrack/1.0 (local-first fitness app)" },
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("content-type") ?? "application/json",
        "Cache-Control": "s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream failed", products: [] }, { status: 502 });
  }
}
