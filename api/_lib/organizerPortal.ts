// Sales for one organiser's events, read on the server with the service
// account. Organisers never read orders from the database directly (the
// security rules keep orders to their buyer and admins); this report gives
// them exactly their own events' sales and attendee list, nothing else.
import type { ServiceAccount } from './firebaseAuthUsers.js';
import { getDocument, queryDocuments, type DocData } from './firestoreAdmin.js';
import { buildAvailability, type EventAvailability } from './availability.js';

export interface OrganizerTierStats {
  name: string;
  sold: number;
  revenueUsd: number;
}

export interface OrganizerEventStats {
  id: string;
  title: string;
  status: string;
  date: string;
  image: string;
  venue: string;
  capacity: number;
  ticketsSold: number;
  revenueUsd: number;
  orders: number;
  passes: number;
  checkedIn: number;
  /** Free tickets (guest list / complimentary) among ticketsSold. */
  complimentary: number;
  tiers: OrganizerTierStats[];
  /** Tickets left per ticket type, sales-end status — same as the checkout. */
  availability: EventAvailability;
  waitlist: number;
}

export interface OrganizerWaitlistEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  tier: string;
  createdAt: string;
  status: string;
  notifiedAt: string;
}

export interface OrganizerOrder {
  id: string;
  eventId: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  tierName: string;
  quantity: number;
  amountUsd: number;
  currency: string;
  amountLocal: number;
  createdAt: string;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  source: 'online' | 'admin' | 'organizer';
  complimentary: boolean;
  phone: string;
  promoCode: string;
  emailedTo: string;
  tier: string;
}

export interface OrganizerReport {
  organizerId: string;
  events: OrganizerEventStats[];
  orders: OrganizerOrder[];
  waitlist: OrganizerWaitlistEntry[];
  totals: { revenueUsd: number; ticketsSold: number; orders: number; checkedIn: number; followers: number; liveEvents: number };
  generatedAt: string;
}

function orderStatus(b: DocData): OrganizerOrder['status'] {
  if (b.bookingStatus === 'cancelled') return 'cancelled';
  if (b.paymentStatus === 'paid') return 'paid';
  return b.paymentStatus === 'failed' ? 'failed' : 'pending';
}

function eventDate(e: DocData): string {
  if (e.fullDate) return String(e.fullDate);
  return [e.date, e.year].filter(Boolean).join(' ') || 'Date TBA';
}

export async function organizerReport(sa: ServiceAccount | null, organizerUid: string): Promise<OrganizerReport> {
  const events = await queryDocuments(sa, 'events', [{ field: 'organizerId', op: 'EQUAL', value: organizerUid }]);
  const ids = events.map((e) => e.id);
  const [bookings, tickets, follows, waitlistDocs] = await Promise.all([
    queryDocuments(sa, 'bookings', [{ field: 'eventId', op: 'IN', value: ids }]),
    queryDocuments(sa, 'tickets', [{ field: 'eventId', op: 'IN', value: ids }]),
    queryDocuments(sa, 'follows', [
      { field: 'targetType', op: 'EQUAL', value: 'organizer' },
      { field: 'targetId', op: 'EQUAL', value: organizerUid },
    ]),
    queryDocuments(sa, 'waitlist', [{ field: 'eventId', op: 'IN', value: ids }]).catch(() => [] as DocData[]),
  ]);

  // Orders saved without a billing name/email (older or admin-issued ones):
  // fall back to the buyer's account.
  const missing = [...new Set(bookings.filter((b) => !b.billingEmail && b.userId).map((b) => String(b.userId)))].slice(0, 200);
  const accounts = new Map<string, DocData>();
  await Promise.all(
    missing.map(async (uid) => {
      const u = await getDocument(sa, `users/${uid}`).catch(() => null);
      if (u) accounts.set(uid, u);
    }),
  );

  const titleOf = new Map(events.map((e) => [e.id, String(e.title || 'Untitled event')]));
  const orders: OrganizerOrder[] = bookings
    .map((b) => {
      const account = accounts.get(String(b.userId || ''));
      return {
        id: b.id,
        eventId: String(b.eventId || ''),
        eventTitle: titleOf.get(String(b.eventId)) || String(b.eventTitle || ''),
        buyerName: String(b.billingName || account?.name || ''),
        buyerEmail: String(b.billingEmail || account?.email || ''),
        tierName: String(b.tierName || b.ticketType || 'General admission'),
        quantity: Math.max(1, Number(b.quantity) || 1),
        amountUsd: Number(b.amount ?? b.pricePaid) || 0,
        currency: String(b.currency || 'USD'),
        amountLocal: Number(b.amountLocal) || 0,
        createdAt: String(b.createdAt || b.bookingDate || ''),
        status: orderStatus(b),
        source: b.source === 'admin' ? ('admin' as const) : b.source === 'organizer' ? ('organizer' as const) : ('online' as const),
        complimentary: b.paymentMethod === 'complimentary',
        phone: String(b.billingPhone || ''),
        promoCode: b.promoApplied ? String(b.promoCode || 'Yes') : '',
        emailedTo: String(b.emailedTo || ''),
        tier: String(b.tier || b.ticketType || 'general'),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const stats: OrganizerEventStats[] = events.map((e) => {
    const sold = orders.filter((o) => o.eventId === e.id && o.status === 'paid');
    const tiers = new Map<string, OrganizerTierStats>();
    for (const o of sold) {
      const t = tiers.get(o.tierName) || { name: o.tierName, sold: 0, revenueUsd: 0 };
      t.sold += o.quantity;
      t.revenueUsd += o.amountUsd;
      tiers.set(o.tierName, t);
    }
    const passes = tickets.filter((t) => t.eventId === e.id && t.status !== 'cancelled');
    const eventBookings = bookings.filter((b) => b.eventId === e.id);
    return {
      id: e.id,
      title: String(e.title || 'Untitled event'),
      status: String(e.status || 'draft'),
      date: eventDate(e),
      image: String(e.image || e.bannerImage || ''),
      venue: [e.venue, e.city].filter(Boolean).join(', '),
      capacity: Number(e.capacity) || 0,
      ticketsSold: sold.reduce((s, o) => s + o.quantity, 0),
      revenueUsd: sold.reduce((s, o) => s + o.amountUsd, 0),
      orders: sold.length,
      passes: passes.length,
      checkedIn: passes.filter((t) => t.status === 'scanned').length,
      complimentary: sold.filter((o) => o.complimentary).reduce((s, o) => s + o.quantity, 0),
      tiers: [...tiers.values()],
      availability: buildAvailability(e, eventBookings),
      waitlist: waitlistDocs.filter((w) => w.eventId === e.id && w.status !== 'notified').length,
    };
  });

  return {
    organizerId: organizerUid,
    events: stats,
    orders: orders.slice(0, 2000),
    waitlist: waitlistDocs
      .map((w) => ({
        id: w.id,
        eventId: String(w.eventId || ''),
        eventTitle: titleOf.get(String(w.eventId)) || '',
        name: String(w.name || ''),
        email: String(w.email || ''),
        tier: String(w.tier || ''),
        createdAt: String(w.createdAt || ''),
        status: String(w.status || 'waiting'),
        notifiedAt: String(w.notifiedAt || ''),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    totals: {
      revenueUsd: stats.reduce((s, e) => s + e.revenueUsd, 0),
      ticketsSold: stats.reduce((s, e) => s + e.ticketsSold, 0),
      orders: stats.reduce((s, e) => s + e.orders, 0),
      checkedIn: stats.reduce((s, e) => s + e.checkedIn, 0),
      followers: follows.length,
      liveEvents: stats.filter((e) => e.status === 'published').length,
    },
    generatedAt: new Date().toISOString(),
  };
}
