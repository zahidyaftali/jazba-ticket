// How many tickets are left for an event made on this site (by an admin or
// an organiser), in total and per ticket type, and whether a ticket type's
// sales have ended. WordPress events have no limits and aren't counted.
//
// Sold = paid or complimentary orders that aren't cancelled. Each order
// counts its quantity (a group package counts once, like at checkout).
import { serviceAccountFromEnv, type ServiceAccount } from './firebaseAuthUsers.js';
import { getDocument, queryDocuments, type DocData } from './firestoreAdmin.js';

export interface TierAvailability {
  /** 0 = no limit of its own. */
  capacity: number;
  sold: number;
  /** null = no limit. */
  left: number | null;
  /** ISO time sales close, '' when they don't. */
  salesEnd: string;
  salesEnded: boolean;
}

export interface EventAvailability {
  eventId: string;
  capacity: number;
  sold: number;
  left: number | null;
  tiers: Record<string, TierAvailability>;
  /** Every ticket type is sold out or closed (or the event is full). */
  soldOut: boolean;
  checkedAt: string;
}

export const tierOfBooking = (b: DocData): string => String(b.tier || b.ticketType || 'general');

export function countsAsSold(b: DocData): boolean {
  if (b.bookingStatus === 'cancelled') return false;
  return b.paymentStatus === 'paid' || b.paymentMethod === 'complimentary';
}

export function salesHaveEnded(salesEnd: unknown, now = Date.now()): boolean {
  const t = typeof salesEnd === 'string' && salesEnd ? Date.parse(salesEnd) : NaN;
  return Number.isFinite(t) && t <= now;
}

/** The ticket types an event sells: its own list, else General/VIP/Elite. */
export function eventTiers(event: DocData): Array<{ id: string; capacity: number; salesEnd: string }> {
  const options = Array.isArray(event.ticketOptions) ? event.ticketOptions : [];
  if (options.length) {
    return options
      .filter((o: any) => o && typeof o.id === 'string' && Number(o.price) > 0)
      .map((o: any) => ({ id: o.id, capacity: Math.max(0, Math.floor(Number(o.capacity) || 0)), salesEnd: typeof o.salesEnd === 'string' ? o.salesEnd : '' }));
  }
  const tp = event.tierPrices || {};
  const out: Array<{ id: string; capacity: number; salesEnd: string }> = [];
  if ((Number(tp.general) || Number(event.price)) > 0) out.push({ id: 'general', capacity: 0, salesEnd: '' });
  if (Number(tp.vip) > 0) out.push({ id: 'vip', capacity: 0, salesEnd: '' });
  if (Number(tp.elite) > 0) out.push({ id: 'elite', capacity: 0, salesEnd: '' });
  return out;
}

export function buildAvailability(event: DocData, bookings: DocData[], now = Date.now()): EventAvailability {
  const sold = bookings.filter(countsAsSold);
  const soldBy = new Map<string, number>();
  let total = 0;
  for (const b of sold) {
    const q = Math.max(1, Number(b.quantity) || 1);
    total += q;
    soldBy.set(tierOfBooking(b), (soldBy.get(tierOfBooking(b)) || 0) + q);
  }
  const capacity = Math.max(0, Math.floor(Number(event.capacity) || 0));
  const eventLeft = capacity > 0 ? Math.max(0, capacity - total) : null;
  const tiers: Record<string, TierAvailability> = {};
  for (const t of eventTiers(event)) {
    const s = soldBy.get(t.id) || 0;
    const own = t.capacity > 0 ? Math.max(0, t.capacity - s) : null;
    const left = own === null ? eventLeft : eventLeft === null ? own : Math.min(own, eventLeft);
    tiers[t.id] = { capacity: t.capacity, sold: s, left, salesEnd: t.salesEnd, salesEnded: salesHaveEnded(t.salesEnd, now) };
  }
  const list = Object.values(tiers);
  const soldOut = (eventLeft !== null && eventLeft <= 0) || (list.length > 0 && list.every((t) => t.salesEnded || (t.left !== null && t.left <= 0)));
  return { eventId: String(event.id || ''), capacity, sold: total, left: eventLeft, tiers, soldOut, checkedAt: new Date(now).toISOString() };
}

/** Availability straight from the database (service account). */
export async function eventAvailability(sa: ServiceAccount | null, eventId: string, eventDoc?: DocData | null): Promise<EventAvailability | null> {
  const event = eventDoc || (await getDocument(sa, `events/${eventId}`));
  if (!event) return null;
  const bookings = await queryDocuments(sa, 'bookings', [{ field: 'eventId', op: 'EQUAL', value: eventId }]);
  return buildAvailability({ ...event, id: eventId }, bookings);
}

/** For the checkout: availability, or null when it can't be read. A wrong
 *  "sold out" would cost real sales, so a database hiccup lets the sale
 *  through; an occasional oversell is fixable. */
export async function availabilityForCheckout(eventId: string): Promise<EventAvailability | null> {
  try {
    const sa = serviceAccountFromEnv(process.env);
    if (!sa && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    return await eventAvailability(sa, eventId);
  } catch (err: any) {
    console.error('Availability check skipped:', err?.message || err);
    return null;
  }
}
