import { EventItem, CategoryItem, FAQItem } from './types';

export const categories: CategoryItem[] = [
  { id: 'all', name: 'All Categories', iconType: 'music' }, // helpful addition for filtering
  { id: 'music', name: 'Music Concerts', iconType: 'music' },
  { id: 'theater', name: 'Theater & Arts', iconType: 'theater' },
  { id: 'sports', name: 'Sports Events', iconType: 'sports' },
  { id: 'festivals', name: 'Festivals & Live Shows', iconType: 'festivals' },
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
    question: 'How do I book an event ticket online?',
    answer: 'Most event booking platforms allow you to browse events, select your preferred date and time, choose the number of tickets, and proceed to checkout. Payments can usually be made via credit/debit cards, digital wallets, or UPI. After payment, you\'ll receive a confirmation email or e-ticket.'
  },
  {
    id: 'faq-2',
    question: 'Can I cancel or reschedule my ticket after booking?',
    answer: 'Ticket cancellation and rescheduling policies depend heavily on the event organizer. Many tickets are non-refundable, while some permit transfers or refunds up to 24-48 hours before the event starts. Please review the ticket details page or terms during booking.'
  },
  {
    id: 'faq-3',
    question: 'How do I know if my ticket is confirmed?',
    answer: 'Once your payment is successfully completed, you will receive an immediate on-screen booking confirmation with a reference ID. An email containing your digital ticket, receipt, and custom QR/barcode will be sent immediately to your registered email address.'
  },
  {
    id: 'faq-4',
    question: 'Are group discounts available for bulk ticket purchases?',
    answer: 'Yes! Group discounts are available for most major concerts, theater shows, and corporate conferences. For bookings of 10 or more tickets, look for a "Group Discount" package option or contact our special support center during checkout.'
  },
  {
    id: 'faq-5',
    question: 'What should I do if I don\'t receive my ticket after booking?',
    answer: 'First, check your Spam or Promotions folder. If you still cannot find your confirmation email, log in to your Jazbaticket account, go to "My Passes", or use our Live Chat assistant with your transaction details to retrieve your ticket instantly.'
  }
];
