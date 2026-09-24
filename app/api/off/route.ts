import { NextRequest, NextResponse } from "next/server";

// OpenFoodFacts search proxy. OFF requires a descriptive User-Agent, which
// browsers can't set on a cross-origin fetch — so the request is proxied here.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ products: [] });

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: "code,product_name,brands,nutriments,serving_size",
  });
  const url = "https://world.openfoodfacts.org/cgi/search.pl?" + params.toString();

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
