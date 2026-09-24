import { describe, expect, test } from "vitest";
import { mapOffProduct, type OffProduct } from "@/lib/off";

describe("mapOffProduct", () => {
  test("maps a full product to a Food with off id and brand-appended name", () => {
    const p: OffProduct = {
      code: "737628064502",
      product_name: "Greek Yogurt",
      brands: "Fage, Total",
      nutriments: {
        "energy-kcal_100g": 97,
        proteins_100g: 9,
        carbohydrates_100g: 4,
        fat_100g: 5,
      },
    };
    const f = mapOffProduct(p)!;
    expect(f.id).toBe("off-737628064502");
    expect(f.name).toBe("Greek Yogurt (Fage)"); // first brand only
    expect(f.brand).toBe("Fage");
    expect(f.base).toBe("g");
    expect(f.kcal).toBe(97);
    expect(f.p).toBe(9);
    expect(f.c).toBe(4);
    expect(f.f).toBe(5);
    expect(f.source).toBe("off");
    expect(f.servings).toEqual([]);
  });

  test("derives kcal via 4/4/9 when energy-kcal_100g is absent", () => {
    const p: OffProduct = {
      code: "111",
      product_name: "No Energy Food",
      nutriments: { proteins_100g: 10, carbohydrates_100g: 20, fat_100g: 5 },
    };
    const f = mapOffProduct(p)!;
    expect(f.kcal).toBe(4 * 10 + 4 * 20 + 9 * 5); // 165
  });

  test("coerces numeric-string nutriments", () => {
    const p: OffProduct = {
      code: "222",
      product_name: "Stringy",
      nutriments: { "energy-kcal_100g": "120", proteins_100g: "6" },
    };
    const f = mapOffProduct(p)!;
    expect(f.kcal).toBe(120);
    expect(f.p).toBe(6);
  });

  test("skips products with no name", () => {
    expect(mapOffProduct({ code: "333", product_name: "", nutriments: { proteins_100g: 5 } })).toBeNull();
  });

  test("skips products with no code", () => {
    expect(mapOffProduct({ product_name: "No Code", nutriments: { proteins_100g: 5 } })).toBeNull();
  });

  test("skips products with no macros at all", () => {
    expect(mapOffProduct({ code: "444", product_name: "Water", nutriments: {} })).toBeNull();
  });

  test("keeps name without brand when brands is empty", () => {
    const f = mapOffProduct({ code: "555", product_name: "Plain Oats", nutriments: { proteins_100g: 12 } })!;
    expect(f.name).toBe("Plain Oats");
    expect(f.brand).toBeUndefined();
  });
});
