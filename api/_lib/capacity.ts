// Sold-out protection for events made on this site (by an admin or an
// organiser): a checkout can't take an event past its capacity. WordPress
// events have no capacity and aren't checked. If the count can't be read
// (no service account, database hiccup) the sale goes ahead — a wrong
// "sold out" would cost real sales, an occasional oversell is fixable.
import { serviceAccountFromEnv } from './firebaseAuthUsers.js';
import { queryDocuments } from './firestoreAdmin.js';

/** Tickets still available, or null when it can't be told. */
export async function ticketsLeft(eventId: string, capacity: number): Promise<number | null> {
  if (!(capacity > 0)) return null;
  try {
    const sa = serviceAccountFromEnv(process.env);
    if (!sa && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const bookings = await queryDocuments(sa, 'bookings', [{ field: 'eventId', op: 'EQUAL', value: eventId }]);
    const sold = bookings
      .filter((b) => b.paymentStatus === 'paid' && b.bookingStatus !== 'cancelled')
      .reduce((sum, b) => sum + Math.max(1, Number(b.quantity) || 1), 0);
    return Math.max(0, capacity - sold);
  } catch (err: any) {
    console.error('Capacity check skipped:', err?.message || err);
    return null;
  }
}
