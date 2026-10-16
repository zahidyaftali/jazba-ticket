import type { EventItem, EventShow, LineupEntry, PriceLine, TicketOption } from '../../src/types';
// The .js extension is required: Vercel runs these as native ESM.
import { USD_RATES } from './currencyRates.js';

// ── Events from jazbaentertainment.com ─────────────────────────────────────
// Jazba Entertainment publishes its events on its WordPress site (custom post
// type `jazba_event`, public REST API). This module turns each post into this
// site's EventItem shape, and it is the ONLY place that reads WordPress: the
// public listing (api/wp-events.ts) and the payment server (stripePayment.ts)
// both go through mapWordPressEvent(), so the price a buyer sees on the event
// page is exactly the price their Stripe checkout is created with.
//
// Ticket prices come from the "Tickets" block in the post body
// (<section class="jz-tickets">), entered there in PKR or GBP. They are
// converted to USD here because every price on this site is stored in USD and
// converted back to the visitor's currency for display and payment.

const WP_API = 'https://jazbaentertainment.com/wp-json/wp/v2/jazba_event';
const FETCH_TIMEOUT_MS = 15000;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop';

/** WordPress events get this id prefix here, e.g. post 700 → "wp-700". */
export const WP_EVENT_PREFIX = 'wp-';

// A WP ticket link pointing at one of these hosts means "sold on Jazba
// Tickets", so the event goes through this site's Stripe checkout. Any other
// link (e.g. a partner charity's shop) is shown as an external booking link.
const OWN_TICKET_HOSTS = new Set(['jazbatickets.com', 'www.jazbatickets.com', 'jazba-ticket.vercel.app']);

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── HTML helpers (WordPress content is server-rendered HTML) ───────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', middot: '·', pound: '£',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Strip tags, decode entities and collapse whitespace. */
function toText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

/** Inner HTML of the first element carrying the given class. */
function innerOfClass(html: string, className: string, tag = '[a-z][a-z0-9]*'): string {
  const re = new RegExp(`<(${tag})\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`, 'i');
  return html.match(re)?.[2] ?? '';
}

function allOfClass(html: string, className: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  return Array.from(html.matchAll(re), (m) => m[1]);
}

const VOID_TAGS = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Split HTML into its top-level elements, e.g. the <p>, <h2>, <ul> and
 *  <section> blocks of a post body, each with its full outer HTML. */
function topLevelBlocks(html: string): { tag: string; html: string }[] {
  const source = html.replace(/<!--[\s\S]*?-->/g, '');
  const blocks: { tag: string; html: string }[] = [];
  const stack: string[] = [];
  let start = 0;
  for (const m of source.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [whole, closing, rawTag, selfClosing] = m;
    const tag = rawTag.toLowerCase();
    if (VOID_TAGS.has(tag) || selfClosing) continue;
    if (!closing) {
      if (stack.length === 0) start = m.index!;
      stack.push(tag);
      continue;
    }
    const at = stack.lastIndexOf(tag);
    if (at === -1) continue; // stray closing tag
    stack.length = at;
    if (stack.length === 0) blocks.push({ tag, html: source.slice(start, m.index! + whole.length) });
  }
  return blocks;
}

const hasClass = (html: string, className: string) =>
  new RegExp(`^<[a-z0-9]+\\b[^>]*class="[^"]*\\b${className}\\b`, 'i').test(html);

// ── Prices, dates, times ───────────────────────────────────────────────────

interface ParsedPrice {
  amount: number;
  currency: string;
  /** "PKR 2,200 each" — a per-person rate with a minimum, booked by enquiry. */
  perPerson: boolean;
  label: string;
}

function parsePrice(text: string): ParsedPrice | null {
  const label = toText(text);
  const m = label.match(/(PKR|Rs\.?|GBP|USD|£|\$)\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const symbol = m[1].toUpperCase();
  const currency = symbol === '£' || symbol === 'GBP' ? 'GBP' : symbol === '$' || symbol === 'USD' ? 'USD' : 'PKR';
  const amount = Number(m[2].replace(/,/g, ''));
  if (!(amount > 0)) return null;
  return { amount, currency, perPerson: /\beach\b/i.test(label), label };
}

/** Native price → USD, the unit every price on this site is stored in. */
function toUsd(price: ParsedPrice): number {
  return price.amount / USD_RATES[price.currency];
}

interface LocalDateTime { y: number; mo: number; d: number; hh: number; mm: number }

/** "2026-11-08T19:00" / "2026-11-08 19:00" / "2026-11-08" — the venue's local time. */
function parseLocalDateTime(value: string): LocalDateTime | null {
  const m = (value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [y, mo, d, hh, mm] = [Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0)];
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return { y, mo, d, hh, mm };
}

const isoDate = (t: LocalDateTime) => `${t.y}-${String(t.mo + 1).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
const pad2 = (n: number) => String(n).padStart(2, '0');

function formatDateRange(first: LocalDateTime, last: LocalDateTime | null): string {
  if (!last || isoDate(first) === isoDate(last)) return `${first.d} ${MONTH_LONG[first.mo]} ${first.y}`;
  if (first.y === last.y && first.mo === last.mo) return `${first.d}–${last.d} ${MONTH_LONG[first.mo]} ${first.y}`;
  if (first.y === last.y) return `${first.d} ${MONTH_LONG[first.mo]} – ${last.d} ${MONTH_LONG[last.mo]} ${first.y}`;
  return `${first.d} ${MONTH_LONG[first.mo]} ${first.y} – ${last.d} ${MONTH_LONG[last.mo]} ${last.y}`;
}

/** "6:00 pm" → "18:00", matching the 24-hour times used across the site. */
function to24Hour(text: string): string {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m/i);
  if (!m) return '';
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return `${pad2(h)}:${m[2] || '00'}`;
}

// ── Tickets block ──────────────────────────────────────────────────────────

interface ParsedTier { name: string; note: string; price: ParsedPrice; group: boolean }
interface ParsedShow { name: string; when: string; details: string[]; tiers: ParsedTier[]; ticketUrl: string }

function parseTierList(listHtml: string, group: boolean): ParsedTier[] {
  const tiers: ParsedTier[] = [];
  for (const li of listHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const label = li[1].match(/<span\b[^>]*>([\s\S]*)<\/span>/i)?.[1] ?? '';
    const price = parsePrice(li[1].match(/<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? '');
    const name = toText(label.split(/<small\b/i)[0]);
    if (!name || !price) continue;
    const note = Array.from(label.matchAll(/<small\b[^>]*>([\s\S]*?)<\/small>/gi), (s) => toText(s[1])).filter(Boolean).join(' · ');
    tiers.push({ name, note, price, group });
  }
  return tiers;
}

/** Each <article class="jz-tier"> is one show (a city/date) with its price lists. */
function parseTicketShows(sectionHtml: string): ParsedShow[] {
  return allOfClass(sectionHtml, 'jz-tier', 'article').map((article) => {
    const whenParts = innerOfClass(article, 'jz-tickets__when', 'p').split(/<small\b[^>]*>/i);
    // Lists after the "Groups of 4 or more" line are group packages.
    const groupAt = article.search(/class="[^"]*\bjz-tickets__group\b/i);
    const tiers: ParsedTier[] = [];
    for (const list of article.matchAll(/<ul\b[^>]*class="[^"]*\bjz-tickets__list\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi)) {
      tiers.push(...parseTierList(list[1], groupAt !== -1 && list.index! > groupAt));
    }
    const href = innerOfClass(article, 'jz-tiers__actions', 'p').match(/<a\b[^>]*href="([^"]+)"/i)?.[1] ?? '';
    return {
      name: toText(article.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? ''),
      when: toText(whenParts[0] ?? ''),
      details: whenParts.slice(1).map(toText).filter(Boolean),
      tiers,
      ticketUrl: decodeEntities(href),
    };
  });
}

function isOwnTicketUrl(url: string): boolean {
  try {
    return OWN_TICKET_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'ticket';
}

/** The packages sold through this site's checkout, cheapest first (single
 *  tickets before group packages, so the default pick is a single ticket). */
function buildTicketOptions(shows: ParsedShow[]): (TicketOption & { group: boolean })[] {
  const multiCity = shows.length > 1;
  const used = new Set<string>();
  const options: (TicketOption & { group: boolean })[] = [];
  for (const show of shows) {
    const sellable = show.tiers.filter((t) => !t.price.perPerson);
    const ordered = [
      ...sellable.filter((t) => !t.group).sort((a, b) => toUsd(a.price) - toUsd(b.price)),
      ...sellable.filter((t) => t.group).sort((a, b) => toUsd(a.price) - toUsd(b.price)),
    ];
    for (const t of ordered) {
      const name = multiCity && show.name ? `${show.name} · ${t.name}` : t.name;
      let id = slugify(name);
      for (let n = 2; used.has(id); n++) id = `${slugify(name)}-${n}`;
      used.add(id);
      const note = [t.note, multiCity ? show.when : ''].filter(Boolean).join(' · ');
      options.push({ id, name, ...(note ? { note } : {}), price: toUsd(t.price), group: t.group });
    }
  }
  return options;
}

const toPriceLine = (t: ParsedTier): PriceLine => ({ name: t.name, ...(t.note ? { note: t.note } : {}), price: t.price.label });

// ── Body content: description, highlights, line-up ─────────────────────────

interface ParsedBody {
  paragraphs: string[];
  highlights: string[];
  lineup: LineupEntry[];
  shows: ParsedShow[];
  firstImage: string;
}

// Facts already shown in the event header — no need to repeat them as highlights.
const HEADER_FACTS = new Set(['date', 'venue', 'dates', 'venues']);

// Event posts double as sponsorship pitches ("Audience & Reach", "Partners",
// sponsorship tiers…). That copy is for sponsors, not ticket buyers.
const SPONSOR_HEADINGS = /audience|reach|sponsor|partner|government|promoter/i;

function parseBody(html: string): ParsedBody {
  const body: ParsedBody = { paragraphs: [], highlights: [], lineup: [], shows: [], firstImage: '' };
  let heading = '';

  for (const block of topLevelBlocks(html)) {
    if (!body.firstImage) body.firstImage = block.html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? '';

    if (/^h[1-6]$/.test(block.tag)) {
      heading = toText(block.html);
    } else if (block.tag === 'section' && hasClass(block.html, 'jz-tickets')) {
      body.shows.push(...parseTicketShows(block.html));
    } else if (SPONSOR_HEADINGS.test(heading)) {
      continue;
    } else if (block.tag === 'div' && hasClass(block.html, 'jz-lineup')) {
      for (const card of allOfClass(block.html, 'jz-artist-card', 'article')) {
        const name = toText(innerOfClass(card, 'jz-artist-card__name'));
        if (!name) continue;
        body.lineup.push({
          name,
          role: toText(innerOfClass(card, 'jz-artist-card__role')),
          avatar: card.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? '',
          bio: toText(innerOfClass(card, 'jz-artist-card__badge')),
        });
      }
    } else if (block.tag === 'ul' || block.tag === 'ol') {
      for (const li of block.html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
        const keyed = li[1].match(/^\s*<strong>([^<]*?):\s*<\/strong>([\s\S]*)$/i);
        if (keyed) {
          // "<strong>Doors open:</strong> 6:00 pm" → a highlight
          const key = toText(keyed[1]);
          if (!HEADER_FACTS.has(key.toLowerCase())) body.highlights.push(`${key}: ${toText(keyed[2])}`);
        } else if (/line-?up/i.test(heading)) {
          // "<strong>Mohamed Tarek</strong> · Munshid · Egypt" → a performer
          const name = toText(li[1].match(/<strong>([\s\S]*?)<\/strong>/i)?.[1] ?? li[1].split('·')[0]);
          const role = toText(li[1].replace(/<strong>[\s\S]*?<\/strong>/i, '')).replace(/^·\s*/, '');
          if (name) body.lineup.push({ name, role, avatar: '', bio: '' });
        } else {
          const text = toText(li[1]);
          if (text) body.paragraphs.push(`• ${text}`);
        }
      }
    } else if (block.tag === 'p') {
      const text = toText(block.html);
      if (text) body.paragraphs.push(text);
    }
  }
  return body;
}

// ── Post → EventItem ───────────────────────────────────────────────────────

function categoryFor(typeSlugs: string[]): string {
  if (typeSlugs.includes('festival')) return 'festivals';
  if (typeSlugs.some((s) => ['concert', 'qawwali', 'nasheed', 'dj-set', 'tour', 'club-night'].includes(s))) return 'music';
  if (typeSlugs.some((s) => ['live-show', 'gala'].includes(s))) return 'festivals';
  return 'music';
}

function featuredImage(post: any): string {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  const sizes = media?.media_details?.sizes || {};
  return sizes['jazba-wide']?.source_url || sizes.large?.source_url || media?.source_url || '';
}

/** End of the event's (last) day has passed. Lenient by a few hours so a
 *  show is never closed early for buyers in a later timezone. */
export function isWordPressEventOver(event: EventItem): boolean {
  const t = parseLocalDateTime(event.endsOn || '');
  if (!t) return false;
  return Date.UTC(t.y, t.mo, t.d, 23, 59, 59) + 6 * 3600 * 1000 < Date.now();
}

export function mapWordPressEvent(post: any): EventItem {
  const meta = post?.meta || {};
  const body = parseBody(post?.content?.rendered || '');

  // Dates: the event date, plus every line of the "shows" field for tours
  // ("2026-11-06 | Birmingham | Royal Shalimar").
  const start = parseLocalDateTime(meta._jazba_event_date || '') || parseLocalDateTime(post?.date || '');
  const showDates = String(meta._jazba_event_shows || '')
    .split('\n')
    .map((line) => parseLocalDateTime(line.split('|')[0]))
    .filter((t): t is LocalDateTime => !!t)
    .sort((a, b) => isoDate(a).localeCompare(isoDate(b)));
  const first = showDates[0] && (!start || isoDate(showDates[0]) < isoDate(start)) ? showDates[0] : start;
  const last = showDates.length > 1 ? showDates[showDates.length - 1] : null;

  let time = 'Time TBA';
  if (start && (start.hh || start.mm)) {
    time = `${pad2(start.hh)}:${pad2(start.mm)}`;
  } else {
    const doors = body.shows.flatMap((s) => s.details).find((d) => /doors/i.test(d));
    if (doors && to24Hour(doors)) time = `Doors ${to24Hour(doors)}`;
  }

  const tba = (value: string) => (/^(tba|tbc|tbd)$/i.test(value) ? '' : value);
  const venue = tba(toText(meta._jazba_event_venue || ''));
  const city = tba(toText(meta._jazba_event_city || ''));
  const location =
    venue && city && !city.toLowerCase().includes(venue.toLowerCase()) ? `${venue}, ${city}` : city || venue || 'Venue TBA';

  // Where tickets are sold: this site's checkout, or a partner's own shop.
  const ticketUrl = String(meta._jazba_ticket_url || '').trim();
  const externalTicketUrl = ticketUrl && !isOwnTicketUrl(ticketUrl) ? ticketUrl : '';

  const listedPrice = parsePrice(meta._jazba_event_price || '');
  let options: (TicketOption & { group: boolean })[] = [];
  if (!externalTicketUrl) {
    options = buildTicketOptions(body.shows);
    // No Tickets block — fall back to the single listed price, if any.
    if (options.length === 0 && listedPrice && !listedPrice.perPerson) {
      options = [{ id: 'general', name: 'General admission', price: toUsd(listedPrice), group: false }];
    }
  }
  const ticketOptions: TicketOption[] = options.map(({ group, ...option }) => option);

  // "From" price: the cheapest single ticket on sale here, else the listed price.
  const singles = options.filter((o) => !o.group);
  const fromPrice = (singles.length ? singles : options).reduce(
    (min, o) => Math.min(min, o.price),
    options.length ? Infinity : listedPrice ? toUsd(listedPrice) : 0,
  );

  const typeSlugs: string[] = (post?.class_list || [])
    .filter((c: string) => typeof c === 'string' && c.startsWith('jazba_event_type-'))
    .map((c: string) => c.slice('jazba_event_type-'.length));

  // The WordPress slug doubles as this site's URL, so an event lives at the
  // same path on both sites: /events/aa-tenu-moaj-karawan-live-lahore.
  let slug = String(post?.slug || '');
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep the raw slug
  }

  const event: EventItem = {
    id: `${WP_EVENT_PREFIX}${post.id}`,
    ...(slug ? { slug } : {}),
    title: toText(post?.title?.rendered || '') || 'Untitled event',
    image: featuredImage(post) || body.firstImage || FALLBACK_IMAGE,
    category: categoryFor(typeSlugs),
    date: first ? `${first.d} ${MONTH_SHORT[first.mo]}` : 'TBA',
    year: first ? String(first.y) : undefined,
    fullDate: first ? formatDateRange(first, last) : 'Date TBA',
    location,
    time,
    price: fromPrice,
    type: 'upcoming',
    organizerName: 'Jazba Entertainment',
    // Served from public/images — the gold emblem from the jazbaentertainment.com theme.
    organizerImage: '/images/jazba-entertainment-logo.png',
    ...(first ? { endsOn: isoDate(last || first) } : {}),
  };

  const description = (body.paragraphs.length ? body.paragraphs : [toText(post?.excerpt?.rendered || '')]).filter(Boolean).join('\n');
  if (description) event.description = description;
  if (body.highlights.length) event.highlights = body.highlights;
  if (body.lineup.length) event.lineup = body.lineup;
  if (venue && body.shows.length <= 1) event.venueInfo = { mapUrl: location };

  if (externalTicketUrl) {
    event.externalTicketUrl = externalTicketUrl;
  } else if (ticketOptions.length) {
    event.ticketOptions = ticketOptions;
    const enquiry = body.shows.flatMap((s) => s.tiers.filter((t) => t.price.perPerson).map(toPriceLine));
    if (enquiry.length) event.enquiryPackages = enquiry;
  }

  // Tours and partner-sold events list every date/city with its prices.
  if (body.shows.length > 1 || (externalTicketUrl && body.shows.length)) {
    event.shows = body.shows.map((s): EventShow => ({
      name: s.name,
      when: s.when,
      details: s.details,
      prices: s.tiers.map(toPriceLine),
      ...(s.ticketUrl ? { ticketUrl: s.ticketUrl } : {}),
    }));
  }

  // Shows on sale here headline the home page.
  if (event.ticketOptions && !isWordPressEventOver(event)) {
    event.type = 'top';
    event.featured = true;
  }
  return event;
}

// ── Fetching ───────────────────────────────────────────────────────────────

async function wpFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'JazbaTickets/1.0 (+https://jazbatickets.com)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** Every published event on jazbaentertainment.com, mapped for this site. */
export async function fetchWordPressEvents(): Promise<EventItem[]> {
  const events: EventItem[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await wpFetch(`${WP_API}?per_page=100&page=${page}&_embed=wp:featuredmedia`);
    if (!res.ok) throw new Error(`WordPress events request failed (${res.status})`);
    const posts = await res.json();
    if (!Array.isArray(posts)) throw new Error('WordPress events response was not a list');
    for (const post of posts) {
      if (post?.status === 'publish') events.push(mapWordPressEvent(post));
    }
    if (page >= (Number(res.headers.get('x-wp-totalpages')) || 1)) break;
  }
  return events;
}

/** One event by its id on this site ("wp-700"), or null if it isn't published. */
export async function fetchWordPressEvent(eventId: string): Promise<EventItem | null> {
  const wpId = eventId.startsWith(WP_EVENT_PREFIX) ? eventId.slice(WP_EVENT_PREFIX.length) : '';
  if (!/^\d{1,10}$/.test(wpId)) return null;
  const res = await wpFetch(`${WP_API}/${wpId}`);
  if (res.status === 404 || res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`WordPress event request failed (${res.status})`);
  const post = await res.json();
  return post?.status === 'publish' ? mapWordPressEvent(post) : null;
}
