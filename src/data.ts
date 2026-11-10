import { EventItem, CategoryItem, FAQItem } from './types';

export const categories: CategoryItem[] = [
  { id: 'all', name: 'All categories', iconType: 'music' },
  { id: 'music', name: 'Music & concerts', iconType: 'music' },
  { id: 'theater', name: 'Theatre & comedy', iconType: 'theater' },
  { id: 'sports', name: 'Sport', iconType: 'sports' },
  { id: 'festivals', name: 'Festivals & melas', iconType: 'festivals' },
  { id: 'conferences', name: 'Conferences', iconType: 'conferences' },
  { id: 'exhibitions', name: 'Exhibitions', iconType: 'exhibitions' },
];

export const events: EventItem[] = [
  // --- TOP EVENTS ---
  {
    id: 'top-1',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=600&auto=format&fit=crop&q=80',
    category: 'theater',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 85,
    type: 'top',
    badgeColor: 'yellow'
  },
  {
    id: 'top-2',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 65,
    type: 'top',
    badgeColor: 'yellow'
  },
  {
    id: 'top-3',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    category: 'conferences',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 120,
    type: 'top',
    badgeColor: 'blue'
  },
  {
    id: 'top-4',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 45,
    type: 'top',
    badgeColor: 'yellow'
  },
  {
    id: 'top-5',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 90,
    type: 'top',
    badgeColor: 'yellow'
  },
  {
    id: 'top-6',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80',
    category: 'festivals',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 55,
    type: 'top',
    badgeColor: 'teal'
  },
  {
    id: 'top-7',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1531058020387-3be344559be6?w=600&auto=format&fit=crop&q=80',
    category: 'exhibitions',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 40,
    type: 'top',
    badgeColor: 'yellow'
  },
  {
    id: 'top-8',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1481162854517-d9e353af153d?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 75,
    type: 'top',
    badgeColor: 'yellow'
  },

  // --- EVENTS FOR YOU ---
  {
    id: 'for-you-1',
    title: 'Music Event',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '19 Feb',
    location: 'Hamilton – Live in London',
    time: '08:00 pm to 11:00 pm',
    price: 110,
    type: 'for-you',
    remainingHours: 7,
    remainingMinutes: 48,
    remainingSeconds: 39
  },
  {
    id: 'for-you-2',
    title: 'Music Event',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '20 Feb',
    location: 'Hamilton – Live in London',
    time: '07:30 pm to 10:30 pm',
    price: 95,
    type: 'for-you',
    remainingHours: 7,
    remainingMinutes: 49,
    remainingSeconds: 39
  },
  {
    id: 'for-you-3',
    title: 'Music Event',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '21 Feb',
    location: 'Hamilton – Live in London',
    time: '09:00 pm to 12:00 am',
    price: 130,
    type: 'for-you',
    remainingHours: 7,
    remainingMinutes: 49,
    remainingSeconds: 39
  },

  // --- EVENTS NEAR BY YOUR CITY ---
  {
    id: 'near-1',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=600&auto=format&fit=crop&q=80',
    category: 'theater',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 85,
    type: 'near-by',
    badgeColor: 'blue'
  },
  {
    id: 'near-2',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 65,
    type: 'near-by',
    badgeColor: 'blue'
  },
  {
    id: 'near-3',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    category: 'conferences',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 120,
    type: 'near-by',
    badgeColor: 'blue'
  },
  {
    id: 'near-4',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 45,
    type: 'near-by',
    badgeColor: 'yellow'
  },
  {
    id: 'near-5',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 90,
    type: 'near-by',
    badgeColor: 'yellow'
  },
  {
    id: 'near-6',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=80',
    category: 'festivals',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 55,
    type: 'near-by',
    badgeColor: 'teal'
  },
  {
    id: 'near-7',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1531058020387-3be344559be6?w=600&auto=format&fit=crop&q=80',
    category: 'exhibitions',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 40,
    type: 'near-by',
    badgeColor: 'yellow'
  },
  {
    id: 'near-8',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1481162854517-d9e353af153d?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18 Feb',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 75,
    type: 'near-by',
    badgeColor: 'yellow'
  },

  // --- UPCOMING EVENTS (Rows of list items) ---
  {
    id: 'upcoming-1',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=600&auto=format&fit=crop&q=80',
    category: 'theater',
    date: '18',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 85,
    type: 'upcoming'
  },
  {
    id: 'upcoming-2',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 65,
    type: 'upcoming'
  },
  {
    id: 'upcoming-3',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    category: 'conferences',
    date: '18',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 120,
    type: 'upcoming'
  },
  {
    id: 'upcoming-4',
    title: 'The Phantom of the Opera',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    category: 'music',
    date: '18',
    year: '2025',
    fullDate: '18 February 2025',
    location: 'Hamilton – Live in London',
    time: '12:00 pm to 01:00 pm',
    price: 45,
    type: 'upcoming'
  }
];

export const faqs: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I buy tickets?',
    answer:
      'Open the event, choose your ticket type and how many you need, then pay by card on Stripe\'s secure page. If you\'re in Pakistan you can also pay by Easypaisa. You\'ll need a free Jazba account, so your tickets are always saved for you.',
  },
  {
    id: 'faq-2',
    question: 'Where do I find my tickets?',
    answer:
      'We email your e-ticket, with a PDF attached, as soon as you\'ve paid. It\'s also under My tickets in your account, where you can download it again any time. Show the QR code at the door on your phone or printed.',
  },
  {
    id: 'faq-3',
    question: 'Are there any booking fees?',
    answer:
      'No. The price on the event page is the price you pay at checkout. You\'ll see it in pounds, dollars or rupees depending on where you are.',
  },
  {
    id: 'faq-4',
    question: 'Can I get a refund?',
    answer:
      'If an event is cancelled, you get your money back in full. If you can\'t make it, you can cancel free within 24 hours of booking (when the event is at least 72 hours away), or up to 7 days before the event for a refund minus a 10% admin fee. The full details are on our refund policy page.',
  },
  {
    id: 'faq-5',
    question: 'The event is sold out. Can I still go?',
    answer:
      'Join the waitlist on the event page. If the organiser releases more tickets, we\'ll email you straight away, and it\'s first come, first served.',
  },
  {
    id: 'faq-6',
    question: 'My ticket email hasn\'t arrived.',
    answer:
      'Check your spam or promotions folder first. Your tickets are also in your account under My tickets. Still nothing? Email info@jazbatickets.com with your order number and we\'ll sort it out.',
  },
];


/** A category id as people read it, e.g. "theater" → "Theatre". */
const CATEGORY_LABELS: Record<string, string> = {
  music: 'Music',
  theater: 'Theatre',
  theatre: 'Theatre',
  comedy: 'Comedy',
  sports: 'Sport',
  festivals: 'Festival',
  conferences: 'Conference',
  exhibitions: 'Exhibition',
};
export function categoryLabel(id?: string): string {
  const key = String(id || '').trim().toLowerCase();
  if (!key) return '';
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}
