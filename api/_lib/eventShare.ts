// The .js extension is required: Vercel runs these as native ESM.
import { FALLBACK_IMAGE, fetchWordPressEventBySlug } from './wordpressEvents.js';

// ── Link previews for event pages ──────────────────────────────────────────
// This site is a single-page app: every URL is answered with the same
// index.html and React fills the page in the browser. WhatsApp, Facebook, X
// and the other link-preview crawlers don't run JavaScript, so on their own
// they'd show the site-wide logo card for every event link. For those
// crawlers only (picked out by User-Agent in vercel.json), api/event-share.ts
// answers /events/<slug> with the same index.html, its title, description,
// URL and image tags swapped for the event's own — so a shared event link
// previews with the event's banner. Visitors never go through this.

export const SITE_URL = 'https://jazbatickets.com';
const SITE_IMAGE = `${SITE_URL}/og-image.png`;
const FETCH_TIMEOUT_MS = 10000;

/** Link-preview crawlers. Keep in step with the user-agent rule in vercel.json. */
export const SHARE_BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|SkypeUriPreview|MicrosoftPreview|Snap URL Preview|vkShare|Embedly|Iframely|Bluesky|Mastodon/;

// Public Firebase web config (same values shipped in the frontend bundle).
const FIREBASE = {
  projectId: 'gen-lang-client-0037466749',
  apiKey: 'AIzaSyBn7JXZLWICgJ4Bw6bNBUWfWQ5XAng6gdU',
  databaseId: 'ai-studio-3fd360dc-3f27-4806-97c6-a0dfddc09741',
};

interface SharePreview {
  title: string;
  description: string;
  image: string;
  url: string;
}

// ── Finding the event ──────────────────────────────────────────────────────

/** Same as slugifyTitle() in src/types.ts. */
function slugifyTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

/** Every URL a Firestore event can live at. withEventSlugs() in src/types.ts
 *  gives it its title slug, plus a short id suffix if that slug is taken; the
 *  raw id link still works too. */
function firestoreSlugs(id: string, title: string, ownSlug: string): string[] {
  const base = ownSlug || slugifyTitle(title) || id.toLowerCase();
  return [base, `${base}-${id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)}`, `${base}-${id}`, id];
}

/** "8 November 2026 · Alhamra Hall, Lahore — Sufi night with…", ≤ 200 chars. */
function describe(when: string, where: string, about: string): string {
  const facts = [when, where].filter((s) => s && !/\bTBA$/i.test(s)).join(' · ');
  const text = [facts, about.replace(/\s+/g, ' ').trim()].filter(Boolean).join(' — ');
  return text.length > 200 ? `${text.slice(0, 197).replace(/\s+\S*$/, '')}…` : text;
}

/** An absolute image URL for crawlers; the logo card if the event has none. */
function shareImage(src: string): string {
  if (!src || src.split('?')[0] === FALLBACK_IMAGE.split('?')[0]) return SITE_IMAGE;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `${SITE_URL}${src}`;
  return /^https?:\/\//i.test(src) ? src : SITE_IMAGE;
}

/** A published event created on this site (Firestore), matched by URL slug. */
async function fetchFirestorePreview(slug: string): Promise<Omit<SharePreview, 'url'> | null> {
  const fields = ['title', 'slug', 'image', 'bannerImage', 'description', 'date', 'fullDate', 'location', 'venue', 'city'];
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}` +
      `/databases/${FIREBASE.databaseId}/documents:runQuery?key=${FIREBASE.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'events' }],
          where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
          select: { fields: fields.map((fieldPath) => ({ fieldPath })) },
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(`Firestore events query failed (${res.status})`);
  const rows = await res.json();

  for (const row of Array.isArray(rows) ? rows : []) {
    const doc = row?.document;
    if (!doc?.name) continue;
    const id = String(doc.name).split('/').pop() || '';
    const str = (key: string) => String(doc.fields?.[key]?.stringValue ?? '').trim();
    if (!firestoreSlugs(id, str('title'), str('slug')).includes(slug)) continue;
    // Same fallbacks as normalizeEvent() in src/services/backendService.ts.
    const location = str('location') || [str('venue'), str('city')].filter(Boolean).join(', ');
    return {
      title: str('title') || 'Event',
      description: describe(str('fullDate') || str('date'), location, str('description')),
      image: shareImage(str('image') || str('bannerImage')),
    };
  }
  return null;
}

/** The event at /events/<slug>, or null if there is none. Throws when a
 *  source couldn't be read and the event wasn't found in the other. */
async function fetchSharePreview(slug: string): Promise<SharePreview | null> {
  const url = `${SITE_URL}/events/${encodeURIComponent(slug)}`;
  // WordPress events come first in the site's event list, so they own a slug.
  const [wp, fs] = await Promise.allSettled([fetchWordPressEventBySlug(slug), fetchFirestorePreview(slug)]);
  if (wp.status === 'fulfilled' && wp.value) {
    const event = wp.value;
    return {
      title: event.title,
      description: describe(event.fullDate, event.location, event.description || ''),
      image: shareImage(event.image),
      url,
    };
  }
  if (fs.status === 'fulfilled' && fs.value) return { ...fs.value, url };
  const failed = [wp, fs].find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) throw failed.reason;
  return null;
}

// ── The page ───────────────────────────────────────────────────────────────

const escapeAttr = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** index.html with its title, description, canonical, Open Graph and Twitter
 *  tags replaced by the event's. */
function withSharePreview(html: string, p: SharePreview): string {
  const title = escapeAttr(p.title);
  const description = escapeAttr(p.description);
  const image = escapeAttr(p.image);
  const tags = [
    `<title>${title} — Tickets | Jazba Tickets</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${escapeAttr(p.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Jazba Tickets" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeAttr(p.url)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:alt" content="${title}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/\s*<\/head>/i, `\n    ${tags.join('\n    ')}\n  </head>`);
}

const MINIMAL_SHELL =
  '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n' +
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  </head>\n  <body></body>\n</html>\n';

/**
 * The page a link-preview crawler gets for /events/<slug>: the site's own
 * index.html (so it is still the full app), with the event's share tags.
 * Never throws. `cacheable` is false when something couldn't be read, so a
 * temporary failure isn't cached by the CDN.
 */
export async function renderEventSharePage(
  slug: string,
  origin: string,
): Promise<{ html: string; found: boolean; cacheable: boolean }> {
  const [shell, preview] = await Promise.all([
    fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null),
    fetchSharePreview(slug).then(
      (p) => ({ p, ok: true }),
      (err: any) => {
        console.error('event-share lookup failed:', err?.message || err);
        return { p: null, ok: false };
      },
    ),
  ]);
  const page = shell || MINIMAL_SHELL;
  return {
    html: preview.p ? withSharePreview(page, preview.p) : page,
    found: !!preview.p,
    cacheable: !!shell && preview.ok,
  };
}
