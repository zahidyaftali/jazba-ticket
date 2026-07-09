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
  transport: string[]; // one line per bullet
  parking: string[]; // one line per bullet
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
  // Every section falls back to a sensible default when unset.
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
