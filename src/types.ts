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
}

/** A price listed for information only (booked by enquiry or on a partner site). */
export interface PriceLine {
  name: string;
  note?: string;
  price: string; // as written by the organiser, e.g. "PKR 2,200 each"
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
}

/** The ticket packages this site's checkout sells for the event, in display
 *  order. General falls back to the event's base price so every admin-created
 *  event stays sellable. Events sold on a partner's site return none. */
export function getAvailableTiers(event: EventItem): AvailableTier[] {
  if (event.externalTicketUrl) return [];
  if (event.ticketOptions?.length) {
    return event.ticketOptions
      .filter((o) => o.price > 0)
      .map((o) => ({ tier: o.id, price: o.price, name: o.name, note: o.note || '' }));
  }
  const tp = event.tierPrices;
  const list: AvailableTier[] = [];
  const general = tp?.general ?? event.price;
  if (general > 0) list.push({ tier: 'general', price: general, ...DEFAULT_TIER_META.general });
  if (tp?.vip && tp.vip > 0) list.push({ tier: 'vip', price: tp.vip, ...DEFAULT_TIER_META.vip });
  if (tp?.elite && tp.elite > 0) list.push({ tier: 'elite', price: tp.elite, ...DEFAULT_TIER_META.elite });
  return list;
}

/** Order maths, in USD. Must stay identical to computeTotalUsd() in
 *  api/_lib/stripePayment.ts so the total shown is the amount charged. */
export function computeOrderTotals(unitPrice: number, quantity: number, promoApplied: boolean) {
  const subtotal = unitPrice * quantity;
  const discount = promoApplied ? subtotal * 0.18 : 0;
  const fees = (subtotal - discount) * 0.08;
  return { subtotal, discount, fees, total: subtotal - discount + fees };
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
