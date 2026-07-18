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

export type TicketTier = 'general' | 'vip' | 'elite';

/** The ticket packages this event actually offers, in display order.
 *  General falls back to the event's base price so every event stays sellable. */
export function getAvailableTiers(event: EventItem): { tier: TicketTier; price: number }[] {
  const tp = event.tierPrices;
  const list: { tier: TicketTier; price: number }[] = [];
  const general = tp?.general ?? event.price;
  if (general > 0) list.push({ tier: 'general', price: general });
  if (tp?.vip && tp.vip > 0) list.push({ tier: 'vip', price: tp.vip });
  if (tp?.elite && tp.elite > 0) list.push({ tier: 'elite', price: tp.elite });
  return list;
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
}

// ---- Past / upcoming detection ------------------------------------------
const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Timestamp for the end of the event's day, or null when the date can't be parsed. */
export function getEventTimestamp(event: EventItem): number | null {
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
