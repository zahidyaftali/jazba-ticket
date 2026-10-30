// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { renderEventSharePage } from './_lib/eventShare.js';

// Vercel serverless function behind a rewrite in vercel.json that only
// link-preview crawlers (WhatsApp, Facebook, X…) hit:
//   /events/aa-tenu-moaj-karawan-live-lahore  →  /api/event-share?slug=…
// Answers with index.html carrying the event's own title, description and
// banner image, so a shared event link previews with that event. See
// api/_lib/eventShare.ts. The CDN caches the page for 10 minutes, then serves
// it stale for up to a day while it refreshes in the background.
export default async function handler(req: any, res: any) {
  const slug = String(req.query?.slug || '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'jazbatickets.com');
  const { html, found, cacheable } = await renderEventSharePage(slug, `https://${host}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    !cacheable
      ? 'no-store'
      : found
        ? 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
        : 'public, max-age=0, s-maxage=60',
  );
  res.status(200).send(html);
}
