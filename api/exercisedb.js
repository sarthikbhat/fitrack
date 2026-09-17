/* Vercel serverless proxy for ExerciseDB (RapidAPI).
   Keeps the API key server-side — the browser calls /api/exercisedb?path=...
   Set RAPIDAPI_KEY in Vercel → Settings → Environment Variables. */
export default async function handler(req, res) {
  const { path = '', ...q } = req.query || {};
  const clean = String(path).replace(/^\/+/, '');
  const qs = new URLSearchParams(q).toString();
  const url = `https://exercisedb.p.rapidapi.com/${clean}${qs ? '?' + qs : ''}`;
  const key = process.env.RAPIDAPI_KEY;
  if (!key) { res.status(500).json({ error: 'RAPIDAPI_KEY not configured' }); return; }
  try {
    const r = await fetch(url, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' },
    });
    const text = await r.text();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream failed' });
  }
}
