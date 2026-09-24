// OpenFoodFacts client. `searchOff` hits our proxy (which adds the required
// User-Agent) and maps each product to the app's `Food` shape. `mapOffProduct`
// is pure and unit-tested against sample product JSON.
import type { Food } from "@/lib/types";

export type OffProduct = {
  code?: string | number;
  product_name?: string;
  brands?: string | string[]; // Search-a-licious returns an array; cgi returned a CSV string
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

/** Coerce an OFF nutriment value (sometimes a numeric string) to a finite number. */
function num(v: number | string | undefined): number {
  const x = typeof v === "string" ? parseFloat(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

/**
 * Map one OFF product to a Food, or null when it isn't usable:
 * skips products with no name or with no macros at all. When `energy-kcal_100g`
 * is absent but macros are present, kcal is derived via 4/4/9 Atwater factors.
 */
export function mapOffProduct(p: OffProduct): Food | null {
  const code = p.code != null ? String(p.code) : "";
  const name = (p.product_name ?? "").trim();
  if (!code || !name) return null;

  const n = p.nutriments ?? {};
  const proteins = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  let kcal = num(n["energy-kcal_100g"]);
  if (!kcal && (proteins || carbs || fat)) kcal = Math.round(4 * proteins + 4 * carbs + 9 * fat);
  if (!kcal && !proteins && !carbs && !fat) return null; // no macros → skip

  const brandRaw = Array.isArray(p.brands) ? p.brands[0] : p.brands;
  const brand = String(brandRaw ?? "").split(",")[0].trim();
  const displayName = brand ? `${name} (${brand})` : name;

  return {
    id: "off-" + code,
    name: displayName,
    brand: brand || undefined,
    base: "g",
    kcal,
    p: proteins,
    c: carbs,
    f: fat,
    servings: [],
    source: "off",
    updatedAt: 0,
  };
}

/** Search OpenFoodFacts via the proxy. Returns [] on any network/parse failure. */
export async function searchOff(q: string): Promise<Food[]> {
  const term = q.trim();
  if (!term) return [];
  try {
    const r = await fetch(`/api/off?q=${encodeURIComponent(term)}`);
    if (!r.ok) return [];
    const data = (await r.json()) as { hits?: OffProduct[]; products?: OffProduct[] };
    // Search-a-licious returns `hits`; keep `products` as a fallback.
    const products = Array.isArray(data?.hits)
      ? data.hits
      : Array.isArray(data?.products)
        ? data.products
        : [];
    const foods: Food[] = [];
    for (const p of products) {
      const f = mapOffProduct(p);
      if (f) foods.push(f);
    }
    return foods;
  } catch {
    return [];
  }
}
