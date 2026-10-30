// ---- Admin-managed page-content structures (single event page) ----
export interface AgendaEntry {
  time: string;
  title: string;
  desc: string;
}

export interface LineupEntry {
  name: string;
  role: string;
  avatar: string;
  bio: string;
}

export interface EventReview {
  name: string;
  avatar?: string;
  rating: number; // 1..5
  date: string;
  text: string;
}

export interface EventFaq {
  question: string;
  answer: string;
}

export interface VenueInfo {
  mapUrl?: string; // Google Maps embed URL or a plain venue address
  transport?: string[]; // one line per bullet
  parking?: string[]; // one line per bullet
}

// Per-package pricing — a package is only offered when its price is set (> 0)
export interface TierPrices {
  general?: number;
  vip?: number;
  elite?: number;
}

/** A ticket package id: "general" | "vip" | "elite" for admin-created events,
 *  or the event's own package ids (e.g. "meet-greet") when it has ticketOptions. */
export type TicketTier = string;

/** A purchasable package defined on the event itself — used by events from
 *  jazbaentertainment.com. When present it replaces general/vip/elite. */
export interface TicketOption {
  id: string;
  name: string;
  note?: string;
  price: number; // USD, like every stored price
  /** Group package: people admitted on one ticket, e.g. 4. */
  groupSize?: number;
}

/** A price listed for information only (booked by enquiry or on a partner site). */
export interface PriceLine {
  name: string;
  note?: string;
  price: string; // as written by the organiser, e.g. "PKR 2,200 each"
}

// ---- Rich event content (the full body of a jazbaentertainment.com post) ----
// Parsed into plain data on the server — never raw HTML — so a post can't
// inject markup or scripts into the page.

/** A run of text, optionally bold/italic and/or a link. A link starting
 *  with "/" is a page on this site; others are http(s), mailto: or tel:. */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export interface ContentPackage {
  name: string;
  badge?: string;
  price?: string;
  points: string[];
  featured?: boolean;
}

export type ContentBlock =
  | { type: 'paragraph'; runs: TextRun[] }
  | { type: 'subheading'; text: string }
  /** facts: every item is "Label: value" — shown as a checklist grid. */
  | { type: 'list'; items: TextRun[][]; facts?: boolean }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'image'; src: string; alt: string; caption?: string }
  | { type: 'partners'; items: { name: string; role: string; logo: string }[] }
  | { type: 'packages'; lead?: string; items: ContentPackage[]; note?: string; action?: { label: string; href: string } }
  | { type: 'link'; label: string; href: string }
  /** Where the post shows its performers — the line-up cards render here. */
  | { type: 'lineup' }
  /** Where the post shows its ticket block — dates/venues and group packages render after this section. */
  | { type: 'tickets' };

export interface ContentSection {
  heading?: string;
  eyebrow?: string;
  blocks: ContentBlock[];
}

/** One date/city of a multi-show listing. */
export interface EventShow {
  name: string;
  when: string;
  details: string[];
  prices: PriceLine[];
  ticketUrl?: string;
}

export const DEFAULT_TIER_META: Record<'general' | 'vip' | 'elite', { name: string; note: string }> = {
  general: { name: 'General admission', note: 'Standard entry, unreserved seating' },
  vip: { name: 'VIP', note: 'Reserved seating and priority entry' },
  elite: { name: 'Elite', note: 'Front rows, lounge access and artist meet' },
};

/** Only VIP packages (vip, vip-group) come with a seat — every other ticket
 *  is standing. Same rule as isSeatedTier() in api/_lib/stripePayment.ts. */
export function isSeatedTier(tier?: string): boolean {
  return /(^|-)vip(-|$)/.test(String(tier || '').toLowerCase());
}

/** The seat to show on a ticket, or '' for a standing ticket. Online orders
 *  only keep a seat on VIP packages (older standing orders were given a
 *  random one by mistake); a seat typed in by an admin is always shown. */
export function ticketSeat(b: { seat?: string; tier?: string; ticketType?: string; source?: string }): string {
  const seat = (b.seat || '').trim();
  if (!seat) return '';
  return b.source === 'admin' || isSeatedTier(b.tier || b.ticketType) ? seat : '';
}

/** Display name for a booked tier: the event's own package name, else the
 *  default label for general/vip/elite. */
export function tierDisplayName(tier: string, event?: EventItem): string {
  return (
    event?.ticketOptions?.find((o) => o.id === tier)?.name ||
    DEFAULT_TIER_META[tier as keyof typeof DEFAULT_TIER_META]?.name ||
    tier
  );
}

export interface AvailableTier {
  tier: TicketTier;
  price: number;
  name: string;
  note: string;
  groupSize?: number;
}

/** The ticket packages this site's checkout sells for the event, in display
 *  order. General falls back to the event's base price so every admin-created
 *  event stays sellable. Events sold on a partner's site return none. */
export function getAvailableTiers(event: EventItem): AvailableTier[] {
  if (event.externalTicketUrl) return [];
  if (event.ticketOptions?.length) {
    return event.ticketOptions
      .filter((o) => o.price > 0)
      .map((o) => ({
        tier: o.id,
        price: o.price,
        name: o.name,
        note: o.note || '',
        ...(o.groupSize ? { groupSize: o.groupSize } : {}),
      }));
  }
  const tp = event.tierPrices;
  const list: AvailableTier[] = [];
  const general = tp?.general ?? event.price;
  if (general > 0) list.push({ tier: 'general', price: general, ...DEFAULT_TIER_META.general });
  if (tp?.vip && tp.vip > 0) list.push({ tier: 'vip', price: tp.vip, ...DEFAULT_TIER_META.vip });
  if (tp?.elite && tp.elite > 0) list.push({ tier: 'elite', price: tp.elite, ...DEFAULT_TIER_META.elite });
  return list;
}

/** The ticket picked before the buyer chooses one: the standard single
 *  ticket (not a concession like Student), else the cheapest single ticket. */
export function defaultTier(tiers: AvailableTier[]): TicketTier {
  const singles = tiers.filter((t) => !t.groupSize);
  const pool = singles.length ? singles : tiers;
  const standard = pool.find((t) => /\b(?:standard|general)\b/i.test(t.name) && !/\bstudents?\b/i.test(t.name));
  const cheapest = pool.reduce<AvailableTier | undefined>((best, t) => (!best || t.price < best.price ? t : best), undefined);
  return (standard || cheapest)?.tier || 'general';
}

/** A promo code: the share taken off the order and, when set, the only events
 *  and ticket packages (tier ids) it works on. */
export interface PromoCode {
  rate: number;
  eventIds?: string[];
  tiers?: TicketTier[];
}

/** Must stay identical to PROMO_CODES in api/_lib/stripePayment.ts, which
 *  sets the price actually charged. */
export const PROMO_CODES = new Map<string, PromoCode>([
  ['JAZBA18', { rate: 0.18 }],
  ['EVENT18', { rate: 0.18 }],
  ['HAMILTON18', { rate: 0.18 }],
  // Aa – Tenu Moaj Karawan Live: Islamabad (wp-607) and Lahore (wp-700),
  // Standard (PKR 3,000) and Standard Group (PKR 11,000) only.
  ['DAKHLAY26', { rate: 0.4, eventIds: ['wp-607', 'wp-700'], tiers: ['standard', 'standard-group'] }],
]);

/** The promo behind a code when it works on this event (on any package). */
export function findPromo(code: string, eventId: string): PromoCode | undefined {
  const promo = PROMO_CODES.get(code.trim().toUpperCase());
  if (!promo || (promo.eventIds && !promo.eventIds.includes(eventId))) return undefined;
  return promo;
}

/** The discount a code gives on an event's package (0.18 = 18%), or 0 when
 *  the code is unknown or doesn't cover that event or package. */
export function promoRate(code: string, eventId: string, tier: TicketTier): number {
  const promo = findPromo(code, eventId);
  if (!promo || (promo.tiers && !promo.tiers.includes(tier))) return 0;
  return promo.rate;
}

/** When an accepted code doesn't cover the chosen package, a note naming the
 *  packages it does cover (e.g. "…Standard and Standard Group tickets only."). */
export function promoPackagesNote(code: string, event: EventItem, tier: TicketTier): string {
  const promo = findPromo(code, event.id);
  if (!promo?.tiers || promo.tiers.includes(tier)) return '';
  const names = getAvailableTiers(event)
    .filter((t) => promo.tiers!.includes(t.tier))
    .map((t) => t.name);
  return names.length ? `This code works on ${names.join(' and ')} tickets only.` : '';
}

/** Order maths, in USD. Must stay identical to computeTotalUsd() in
 *  api/_lib/stripePayment.ts so the total shown is the amount charged. */
export function computeOrderTotals(unitPrice: number, quantity: number, discountRate: number) {
  const subtotal = unitPrice * quantity;
  const discount = subtotal * discountRate;
  return { subtotal, discount, total: subtotal - discount };
}

export interface EventItem {
  id: string;
  title: string;
  image: string;
  category: string;
  date: string; // e.g. "18 Feb"
  year?: string; // e.g. "2025" or "2026"
  fullDate?: string; // e.g. "18 February 2025"
  location: string;
  time: string;
  price: number;
  featured?: boolean;
  type: 'top' | 'for-you' | 'near-by' | 'upcoming';
  badgeColor?: 'yellow' | 'blue' | 'teal' | 'orange';
  remainingHours?: number;
  remainingMinutes?: number;
  remainingSeconds?: number;

  // ---- Optional admin-managed content for the single event page.
  // A section only renders when its content has been added in the admin.
  description?: string;
  highlights?: string[];
  agenda?: AgendaEntry[];
  lineup?: LineupEntry[];
  venueInfo?: VenueInfo;
  gallery?: string[];
  faqs?: EventFaq[];
  reviews?: EventReview[];
  rating?: number; // aggregate, e.g. 4.8
  reviewCount?: number;
  tierPrices?: TierPrices;
  organizerName?: string;
  organizerBio?: string;
  organizerImage?: string;

  // ---- Set on events from jazbaentertainment.com (api/_lib/wordpressEvents.ts)
  /** The whole post body, in order. When present it replaces description/highlights. */
  content?: ContentSection[];
  ticketOptions?: TicketOption[];
  /** Tickets are sold on a partner's site, not through this checkout. */
  externalTicketUrl?: string;
  /** Per-city dates and prices for tours and partner-sold events. */
  shows?: EventShow[];
  /** Packages listed by the organiser but booked by enquiry (e.g. student batches). */
  enquiryPackages?: PriceLine[];
  /** ISO date (yyyy-mm-dd) of the event's last day. */
  endsOn?: string;
  /** Readable URL segment: /events/<slug>. See withEventSlugs(). */
  slug?: string;
}

// ---- Readable event URLs ---------------------------------------------------

/** The event page URL, e.g. /events/aa-tenu-moaj-karawan-live-lahore. */
export function eventPath(event: EventItem): string {
  return `/events/${encodeURIComponent(event.slug || event.id)}`;
}

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

/** Give every event a unique, readable URL slug. Events that bring their own
 *  (jazbaentertainment.com events keep their WordPress slug, so both sites
 *  share the same URL) come first in the list and keep it; the rest get one
 *  from their title, with a short id suffix when two events share a title.
 *  The event id is untouched — checkout and bookings still use it. */
export function withEventSlugs(events: EventItem[]): EventItem[] {
  const taken = new Set<string>();
  return events.map((event) => {
    const base = event.slug || slugifyTitle(event.title) || event.id.toLowerCase();
    let slug = base;
    if (taken.has(slug)) slug = `${base}-${event.id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)}`;
    if (taken.has(slug)) slug = `${base}-${event.id}`;
    taken.add(slug);
    return slug === event.slug ? event : { ...event, slug };
  });
}

// ---- Past / upcoming detection ------------------------------------------
const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Timestamp for the end of the event's day, or null when the date can't be parsed. */
export function getEventTimestamp(event: EventItem): number | null {
  // Multi-date tours stay upcoming until their last show.
  const ends = (event.endsOn || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ends) return new Date(Number(ends[1]), Number(ends[2]) - 1, Number(ends[3]), 23, 59, 59).getTime();

  const m = (event.date || '').match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTH_INDEX[m[2].toLowerCase()];
  if (month === undefined) return null;
  const yearMatch = (event.year || event.fullDate || '').match(/(20\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  return new Date(year, month, day, 23, 59, 59).getTime();
}

/** True once the event's date has passed — used to move it out of the upcoming sections. */
export function isPastEvent(event: EventItem): boolean {
  const ts = getEventTimestamp(event);
  return ts !== null && ts < Date.now();
}

export interface CategoryItem {
  id: string;
  name: string;
  iconType: 'music' | 'theater' | 'sports' | 'festivals' | 'conferences' | 'exhibitions';
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}
