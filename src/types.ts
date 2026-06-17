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
