import { NextRequest, NextResponse } from "next/server";

const ACT = ["Sedentary", "Light Exercise", "Moderate Exercise", "Heavy Exercise", "Athlete"];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const age = q.get("age");
  const kg = q.get("kg");
  const cm = q.get("cm");
  const sex = q.get("sex") ?? "male";
  const activity = q.get("activity") ?? "3";
  const key = process.env.RAPIDAPI_KEY;

  if (!key) return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 500 });
  if (!age || !kg || !cm)
    return NextResponse.json({ error: "age, kg and cm are required" }, { status: 400 });

  const act = ACT[Math.max(0, Math.min(4, Number(activity) - 1))];
  const p = new URLSearchParams({
    measurement_units: "metric",
    sex: sex === "female" ? "female" : "male",
    age_value: String(age),
    age_type: "yrs",
    cm: String(cm),
    kilos: String(kg),
    activity_level: act,
  });
  const url = "https://nutrition-calculator.p.rapidapi.com/api/nutrition-info?" + p.toString();

  try {
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": "nutrition-calculator.p.rapidapi.com",
      },
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
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}
