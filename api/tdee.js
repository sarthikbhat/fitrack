/* Vercel serverless proxy for the Nutrition Calculator (RapidAPI) — TDEE / calorie target.
   Browser calls /api/tdee?age=&kg=&cm=&sex=&activity=  (activity: 1..5)
   Set RAPIDAPI_KEY in Vercel env. */
export default async function handler(req, res) {
  const { age, kg, cm, sex = 'male', activity = '3' } = req.query || {};
  const key = process.env.RAPIDAPI_KEY;
  if (!key) { res.status(500).json({ error: 'RAPIDAPI_KEY not configured' }); return; }
  if (!age || !kg || !cm) { res.status(400).json({ error: 'age, kg and cm are required' }); return; }
  const act = ['Sedentary', 'Light Exercise', 'Moderate Exercise', 'Heavy Exercise', 'Athlete'][Math.max(0, Math.min(4, (+activity) - 1))];
  const p = new URLSearchParams({
    measurement_units: 'metric',
    sex: sex === 'female' ? 'female' : 'male',
    age_value: String(age), age_type: 'yrs',
    cm: String(cm), kilos: String(kg),
    activity_level: act,
  });
  const url = 'https://nutrition-calculator.p.rapidapi.com/api/nutrition-info?' + p.toString();
  try {
    const r = await fetch(url, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'nutrition-calculator.p.rapidapi.com' },
    });
    const text = await r.text();
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream failed' });
  }
}
