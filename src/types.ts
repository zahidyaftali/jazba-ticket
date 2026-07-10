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
