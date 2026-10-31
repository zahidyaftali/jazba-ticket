import type {
  ContentBlock, ContentPackage, ContentSection, EventItem, EventShow, LineupEntry, PriceLine, TextRun, TicketOption,
} from '../../src/types';
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
/** Stock photo shown for an event with no image of its own. */
export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop';

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

interface ParsedTier {
  name: string;
  note: string;
  price: ParsedPrice;
  /** Offer price shown beside a struck-through regular one, during a sale. */
  offer: ParsedPrice | null;
  group: boolean;
  /** People admitted on one group ticket, e.g. 4; 0 if not a group or not stated. */
  groupSize: number;
}
interface ParsedShow { name: string; when: string; details: string[]; tiers: ParsedTier[]; ticketUrl: string }

function parseTierList(listHtml: string, group: boolean, defaultGroupSize: number): ParsedTier[] {
  const tiers: ParsedTier[] = [];
  for (const li of listHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const label = li[1].split(/<b\b/i)[0].match(/<span\b[^>]*>([\s\S]*)<\/span>/i)?.[1] ?? '';
    // During a sale the price reads <s class="jz-offer-was">PKR 3,000</s>
    // <span class="jz-offer-now">PKR 2,250</span>: the regular price is the
    // struck one. Whether the offer price is charged here is decided by
    // SALES in api/_lib/stripePayment.ts, so the sale stops on time.
    const priceHtml = li[1].match(/<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? '';
    const wasHtml = innerOfClass(priceHtml, 'jz-offer-was');
    const price = parsePrice(wasHtml || priceHtml);
    const nowPrice = wasHtml ? parsePrice(innerOfClass(priceHtml, 'jz-offer-now')) : null;
    const offer = nowPrice && price && nowPrice.currency === price.currency && nowPrice.amount < price.amount ? nowPrice : null;
    const name = toText(label.split(/<small\b/i)[0]);
    if (!name || !price) continue;
    const note = Array.from(label.matchAll(/<small\b[^>]*>([\s\S]*?)<\/small>/gi), (s) => toText(s[1])).filter(Boolean).join(' · ');
    // "Group of 4" in the package's own note, else the list's "Groups of 4 or more".
    const groupSize = group ? Number(note.match(/\bgroups? of (\d+)/i)?.[1]) || defaultGroupSize : 0;
    tiers.push({ name, note, price, offer, group, groupSize });
  }
  return tiers;
}

/** Each <article class="jz-tier"> is one show (a city/date) with its price lists. */
function parseTicketShows(sectionHtml: string): ParsedShow[] {
  return allOfClass(sectionHtml, 'jz-tier', 'article').map((article) => {
    const whenParts = innerOfClass(article, 'jz-tickets__when', 'p').split(/<small\b[^>]*>/i);
    // Lists after the "Groups of 4 or more" line are group packages.
    const groupAt = article.search(/class="[^"]*\bjz-tickets__group\b/i);
    const groupSize = Number(toText(innerOfClass(article, 'jz-tickets__group', 'p')).match(/\d+/)?.[0]) || 0;
    const tiers: ParsedTier[] = [];
    for (const list of article.matchAll(/<ul\b[^>]*class="[^"]*\bjz-tickets__list\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi)) {
      tiers.push(...parseTierList(list[1], groupAt !== -1 && list.index! > groupAt, groupSize));
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

/** Ticket order on this site: VIP, Standard, Student, any others, then Meet &
 *  Greet last — each single ticket followed by its group package. */
function ticketRank(t: ParsedTier): number {
  const name = t.name.toLowerCase();
  const family = /meet\s*(?:&|and)\s*greet/.test(name)
    ? 4
    : /\bvip\b/.test(name)
      ? 0
      : /\bstudents?\b/.test(name) // before Standard: "Student Standard" is a student ticket
        ? 2
        : /\b(?:standard|general|regular)\b/.test(name)
          ? 1
          : 3;
  return family * 2 + (t.group ? 1 : 0);
}

/** The packages sold through this site's checkout, in ticketRank() order
 *  (cheapest first within a rank). */
function buildTicketOptions(shows: ParsedShow[]): (TicketOption & { group: boolean })[] {
  const multiCity = shows.length > 1;
  const used = new Set<string>();
  const options: (TicketOption & { group: boolean })[] = [];
  for (const show of shows) {
    const ordered = show.tiers
      .filter((t) => !t.price.perPerson)
      .sort((a, b) => ticketRank(a) - ticketRank(b) || toUsd(a.price) - toUsd(b.price));
    for (const t of ordered) {
      const name = multiCity && show.name ? `${show.name} · ${t.name}` : t.name;
      let id = slugify(name);
      for (let n = 2; used.has(id); n++) id = `${slugify(name)}-${n}`;
      used.add(id);
      const note = [t.note, multiCity ? show.when : ''].filter(Boolean).join(' · ');
      options.push({
        id,
        name,
        ...(note ? { note } : {}),
        price: toUsd(t.price),
        ...(t.offer ? { offerPrice: toUsd(t.offer) } : {}),
        ...(t.groupSize ? { groupSize: t.groupSize } : {}),
        group: t.group,
      });
    }
  }
  return options;
}

const toPriceLine = (t: ParsedTier): PriceLine => ({
  name: t.name,
  ...(t.note ? { note: t.note } : {}),
  price: t.price.label,
  ...(t.offer ? { offer: t.offer.label } : {}),
});

// ── Body content: the whole post, as structured sections ───────────────────
// Every part of the post is kept, in order, as plain data (see ContentBlock in
// src/types.ts). Two parts are pulled out to drive the page itself: the
// Tickets block (booking rail / dates & venues) and the line-up cards — a
// placeholder block marks where each sat in the post.

interface ParsedBody {
  /** Plain text of the opening paragraphs — a short fallback description. */
  intro: string[];
  sections: ContentSection[];
  lineup: LineupEntry[];
  shows: ParsedShow[];
  firstImage: string;
}

const innerHtml = (outer: string) => outer.replace(/^<[^>]*>/, '').replace(/<\/[a-z][a-z0-9]*>\s*$/i, '');

/** Links inside a post: jazbaentertainment.com event pages map to the same
 *  event here (both sites share slugs); otherwise only http(s), mailto: and
 *  tel: links are kept. */
function safeHref(raw: string): string | undefined {
  const href = decodeEntities(raw.trim());
  const event = href.match(/^https?:\/\/(?:www\.)?jazbaentertainment\.com\/events\/([^/?#]+)\/?(?:[?#].*)?$/i);
  if (event) return `/events/${event[1]}`;
  return /^(https?:|mailto:|tel:)/i.test(href) ? href : undefined;
}

/** Inline HTML → text runs, keeping bold, italics and links. */
function parseInline(html: string): TextRun[] {
  const runs: TextRun[] = [];
  let bold = 0;
  let italic = 0;
  const links: (string | undefined)[] = [];

  const push = (raw: string) => {
    const prev = runs[runs.length - 1];
    // Collapse the space between runs, and drop spaces at the start of a line.
    const text = !prev || /[\s]$/.test(prev.text) ? raw.replace(/^ +/, '') : raw;
    if (!text) return;
    if (text === '\n' && prev) prev.text = prev.text.replace(/ +$/, '');
    const run: TextRun = { text };
    if (bold > 0) run.bold = true;
    if (italic > 0) run.italic = true;
    const href = links[links.length - 1];
    if (href) run.href = href;
    if (prev && prev.bold === run.bold && prev.italic === run.italic && prev.href === run.href) prev.text += text;
    else runs.push(run);
  };

  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi)) {
    if (m[4] !== undefined) {
      push(decodeEntities(m[4]).replace(/\s+/g, ' '));
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (tag === 'br') push('\n');
    else if (tag === 'strong' || tag === 'b') bold = Math.max(0, bold + (closing ? -1 : 1));
    else if (tag === 'em' || tag === 'i') italic = Math.max(0, italic + (closing ? -1 : 1));
    else if (tag === 'a') {
      if (closing) links.pop();
      else links.push(safeHref(m[3].match(/\bhref="([^"]*)"/i)?.[1] ?? ''));
    }
  }

  const last = runs[runs.length - 1];
  if (last) last.text = last.text.replace(/\s+$/, '');
  return runs.filter((r) => r.text);
}

const runsText = (runs: TextRun[]) => runs.map((r) => r.text).join('');

function parseList(html: string): ContentBlock | null {
  const items: TextRun[][] = [];
  let facts = true;
  for (const li of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const runs = parseInline(li[1]);
    if (!runs.length) continue;
    items.push(runs);
    // "<strong>Doors open:</strong> 6:00 pm"
    if (!/^\s*<strong>[^<]*:\s*<\/strong>/i.test(li[1])) facts = false;
  }
  return items.length ? { type: 'list', items, ...(facts ? { facts: true } : {}) } : null;
}

function parseTable(html: string): ContentBlock | null {
  const cells = (row: string) => Array.from(row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi), (c) => toText(c[1]));
  const head = cells(html.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1] ?? '');
  const tbody = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? html.replace(/<thead\b[\s\S]*?<\/thead>/i, '');
  const rows = Array.from(tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (r) => cells(r[1])).filter((r) => r.length);
  return rows.length || head.length ? { type: 'table', head, rows } : null;
}

function parseImage(html: string): ContentBlock | null {
  const img = html.match(/<img\b[^>]*>/i)?.[0] ?? '';
  const src = decodeEntities(img.match(/\bsrc="([^"]+)"/i)?.[1] ?? '');
  if (!/^https?:\/\//i.test(src)) return null;
  const alt = decodeEntities(img.match(/\balt="([^"]*)"/i)?.[1] ?? '');
  const caption = toText(html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? '');
  return { type: 'image', src, alt, ...(caption ? { caption } : {}) };
}

function parsePartners(html: string): ContentBlock | null {
  const items = allOfClass(html, 'jz-partner', 'figure')
    .map((figure) => {
      const caption = figure.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? '';
      const logo = decodeEntities(figure.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? '');
      return {
        name: toText(caption.match(/<strong>([\s\S]*?)<\/strong>/i)?.[1] ?? ''),
        role: toText(caption.replace(/<strong>[\s\S]*?<\/strong>/i, '')),
        logo: /^https?:\/\//i.test(logo) ? logo : '',
      };
    })
    .filter((p) => p.name || p.logo);
  return items.length ? { type: 'partners', items } : null;
}

/** A <section class="jz-tiers"> that isn't the Tickets block — e.g. the
 *  sponsorship packages. It becomes a section of its own. */
function parsePackages(html: string): ContentSection {
  const items: ContentPackage[] = [];
  for (const m of html.matchAll(/<article\b[^>]*class="([^"]*\bjz-tier\b[^"]*)"[^>]*>([\s\S]*?)<\/article>/gi)) {
    const [, className, card] = m;
    const nameHtml = innerOfClass(card, 'jz-tier__name', 'h3');
    const badge = toText(innerOfClass(nameHtml, 'jz-tier__badge', 'span'));
    const price = toText(innerOfClass(card, 'jz-tier__price', 'p'));
    items.push({
      name: toText(nameHtml.replace(/<span\b[^>]*class="[^"]*\bjz-tier__badge\b[^"]*"[^>]*>[\s\S]*?<\/span>/i, '')),
      ...(badge ? { badge } : {}),
      ...(price ? { price } : {}),
      points: Array.from(card.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), (li) => toText(li[1])).filter(Boolean),
      ...(/\bjz-tier--featured\b/.test(className) ? { featured: true } : {}),
    });
  }
  const actionLink = innerOfClass(html, 'jz-tiers__actions', 'p').match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  const actionHref = actionLink ? safeHref(actionLink[1]) : undefined;
  const lead = toText(innerOfClass(html, 'jz-tiers__lead', 'p'));
  const note = toText(innerOfClass(html, 'jz-tiers__note', 'p'));
  const eyebrow = toText(innerOfClass(html, 'jz-eyebrow', 'p'));
  return {
    heading: toText(innerOfClass(html, 'jz-tiers__title')) || eyebrow || 'Packages',
    ...(eyebrow ? { eyebrow } : {}),
    blocks: [
      {
        type: 'packages',
        ...(lead ? { lead } : {}),
        items,
        ...(note ? { note } : {}),
        ...(actionLink && actionHref ? { action: { label: toText(actionLink[2]) || 'Find out more', href: actionHref } } : {}),
      },
    ],
  };
}

function parseBody(html: string): ParsedBody {
  const body: ParsedBody = { intro: [], sections: [], lineup: [], shows: [], firstImage: '' };
  let section: ContentSection = { blocks: [] };
  body.sections.push(section);
  let heading = '';
  let lineupPlaced = false;

  const add = (block: ContentBlock | null) => {
    if (block) section.blocks.push(block);
  };
  const startSection = (next: ContentSection) => {
    section = next;
    body.sections.push(section);
  };
  const placeLineup = () => {
    if (!lineupPlaced) add({ type: 'lineup' });
    lineupPlaced = true;
  };

  const walk = (fragment: string) => {
    for (const block of topLevelBlocks(fragment)) {
      if (!body.firstImage) body.firstImage = block.html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? '';
      const { tag } = block;

      if (tag === 'h1' || tag === 'h2') {
        heading = toText(block.html);
        startSection({ heading, blocks: [] });
      } else if (/^h[3-6]$/.test(tag)) {
        const text = toText(block.html);
        if (text) add({ type: 'subheading', text });
      } else if (tag === 'section' && hasClass(block.html, 'jz-tickets')) {
        body.shows.push(...parseTicketShows(block.html));
        add({ type: 'tickets' });
      } else if (tag === 'section' && hasClass(block.html, 'jz-tiers')) {
        startSection(parsePackages(block.html));
      } else if (tag === 'div' && hasClass(block.html, 'jz-lineup')) {
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
        placeLineup();
      } else if (tag === 'div' && hasClass(block.html, 'jz-partners')) {
        add(parsePartners(block.html));
      } else if (tag === 'figure' || tag === 'table') {
        add(/<table\b/i.test(block.html) ? parseTable(block.html) : parseImage(block.html));
      } else if (tag === 'ul' || tag === 'ol') {
        const list = parseList(block.html);
        if (list && list.type === 'list' && !list.facts && /line-?up/i.test(heading)) {
          // "<strong>Mohamed Tarek</strong> · Munshid · Egypt" → performer cards
          for (const li of block.html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
            const name = toText(li[1].match(/<strong>([\s\S]*?)<\/strong>/i)?.[1] ?? li[1].split('·')[0]);
            const role = toText(li[1].replace(/<strong>[\s\S]*?<\/strong>/i, '')).replace(/^·\s*/, '');
            if (name) body.lineup.push({ name, role, avatar: '', bio: '' });
          }
          placeLineup();
        } else {
          add(list);
        }
      } else if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
        if (/<img\b/i.test(block.html) && !toText(block.html)) {
          add(parseImage(block.html));
        } else {
          const runs = parseInline(innerHtml(block.html));
          if (runs.length) add({ type: 'paragraph', runs });
        }
      } else if (['div', 'section', 'article', 'header', 'footer', 'main', 'aside'].includes(tag)) {
        walk(innerHtml(block.html)); // layout wrappers (groups, columns…)
      }
    }
  };

  walk(html);
  body.sections = body.sections.filter((s) => s.blocks.length > 0);
  const opening = body.sections[0] && !body.sections[0].heading ? body.sections[0].blocks : [];
  body.intro = opening.flatMap((b) => (b.type === 'paragraph' ? [runsText(b.runs)] : []));
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

  // The full post, section by section — the event page renders all of it.
  // `description` is just the opening text, for places that want a summary.
  const description = (body.intro.length ? body.intro : [toText(post?.excerpt?.rendered || '')]).filter(Boolean).join('\n');
  if (description) event.description = description;
  const sections = body.sections;
  // The event's PDF (e.g. a sponsorship pack), unless the post already links it.
  const pdf = String(meta._jazba_event_pdf || '').trim();
  if (/^https?:\/\//i.test(pdf) && !JSON.stringify(sections).includes(pdf)) {
    const label = toText(meta._jazba_event_pdf_label || '') || 'Event information';
    sections.push({ heading: 'Downloads', blocks: [{ type: 'link', label: `${label} (PDF)`, href: pdf }] });
  }
  if (sections.length) event.content = sections;
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

/** Just the URL slug of a published WordPress event (post id "700"), or null.
 *  Used to redirect old /events/wp-700 links to /events/<slug>. */
export async function fetchWordPressSlug(wpId: string): Promise<string | null> {
  if (!/^\d{1,10}$/.test(wpId)) return null;
  const res = await wpFetch(`${WP_API}/${wpId}?_fields=slug,status`);
  if (res.status === 404 || res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`WordPress event request failed (${res.status})`);
  const post = await res.json();
  if (post?.status !== 'publish' || !post?.slug) return null;
  try {
    return decodeURIComponent(post.slug);
  } catch {
    return String(post.slug);
  }
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

/** One published event by its URL slug ("aa-tenu-moaj-karawan-live-lahore"),
 *  or null. Used to build the link preview for /events/<slug>. */
export async function fetchWordPressEventBySlug(slug: string): Promise<EventItem | null> {
  if (!slug || slug.length > 200) return null;
  const res = await wpFetch(`${WP_API}?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia`);
  if (!res.ok) throw new Error(`WordPress event request failed (${res.status})`);
  const posts = await res.json();
  const post = Array.isArray(posts) ? posts.find((p: any) => p?.status === 'publish') : null;
  return post ? mapWordPressEvent(post) : null;
}
