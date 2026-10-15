// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { fetchWordPressEvents } from './_lib/wordpressEvents.js';

// Vercel serverless function: GET /api/wp-events
// Returns { events } — every event published on jazbaentertainment.com,
// mapped to this site's event shape. WordPress takes several seconds to
// answer, so Vercel's CDN caches the result: fresh for 5 minutes, then served
// stale (instantly) for up to a day while it refreshes in the background.
// Payments never rely on this cache — the checkout re-reads WordPress live.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const events = await fetchWordPressEvents();
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({ events });
  } catch (err: any) {
    console.error('wp-events failed:', err?.message || err);
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Could not load events right now.' });
  }
}
