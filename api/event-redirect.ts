// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { fetchWordPressSlug } from './_lib/wordpressEvents.js';

// Vercel serverless function behind a rewrite in vercel.json:
//   /events/wp-700  →  /api/event-redirect?id=700
// Answers with a permanent redirect to the event's readable URL
// (/events/aa-tenu-moaj-karawan-live-lahore) before any page loads, so the
// old id never shows in the address bar. The CDN caches the answer for a
// day; browsers for an hour, in case an event's slug is ever renamed.
export default async function handler(req: any, res: any) {
  const id = String(req.query?.id || '');
  let target = '/events';
  try {
    const slug = await fetchWordPressSlug(id);
    if (slug) target = `/events/${encodeURIComponent(slug)}`;
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Location', target);
    res.status(slug ? 308 : 307).end();
  } catch (err: any) {
    // WordPress unreachable — send the visitor to the events list rather
    // than an error page, and don't cache the fallback.
    console.error('event-redirect failed:', err?.message || err);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', target);
    res.status(307).end();
  }
}
