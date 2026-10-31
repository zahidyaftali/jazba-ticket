// The booking + admission passes for a paid card order, written by the
// server once Stripe confirms the payment. This is the only way a card order
// reaches the database: the security rules don't let visitors create
// bookings or tickets themselves, so a "paid" ticket can't be faked.

import type Stripe from 'stripe';
import { createDocuments } from './firestoreAdmin.js';
import type { ServiceAccount } from './firebaseAuthUsers.js';
import type { VerifiedCheckoutSession } from './stripePayment.js';

const VALID_ID = /^[A-Za-z0-9_-]{1,100}$/;

/** Save a paid card order. 'exists' when it was saved already (the success
 *  page and Stripe's notification both arrive here; only the first writes). */
export async function saveCardOrder(
  sa: ServiceAccount | null,
  session: Stripe.Checkout.Session,
  order: VerifiedCheckoutSession,
): Promise<'created' | 'exists'> {
  if (!order.paid) throw new Error('Only paid orders are saved.');
  const id = order.orderId;
  if (!VALID_ID.test(id)) throw new Error(`Unusable order number: ${id}`);

  const m = session.metadata || {};
  const now = new Date();
  const pi = session.payment_intent;
  const quantity = Math.max(1, Math.min(10, order.quantity));

  const booking: Record<string, unknown> = {
    id,
    bookingNumber: id,
    orderId: id,
    eventId: order.eventId,
    eventTitle: m.event_title || undefined,
    eventDate: m.event_date || undefined,
    eventTime: m.event_time || undefined,
    eventVenue: m.event_venue || undefined,
    eventImage: m.event_image || undefined,
    userId: order.buyerUid,
    ticketType: order.tier,
    tier: order.tier,
    tierName: order.tierName,
    quantity,
    seat: order.seat,
    amount: order.amountUsd,
    pricePaid: order.amountUsd,
    currency: (session.currency || 'usd').toUpperCase(),
    amountLocal: typeof session.amount_total === 'number' ? session.amount_total / 100 : undefined,
    paymentStatus: 'paid',
    bookingStatus: 'active',
    paymentMethod: 'stripe',
    source: 'stripe',
    stripeSessionId: session.id,
    stripeTransactionId: typeof pi === 'string' ? pi : pi?.id || '',
    promoApplied: order.promoApplied,
    billingName: order.buyerName || 'Guest',
    billingEmail: order.ticketEmail || order.buyerEmail,
    qrCode: id,
    barCode: id,
    createdAt: now.toISOString(),
    bookingDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  const passes = Array.from({ length: quantity }, (_, i) => {
    const ticketNumber = `${id}-T${i + 1}`;
    return {
      path: `tickets/${ticketNumber}`,
      data: { id: ticketNumber, ticketNumber, bookingId: id, userId: order.buyerUid, eventId: order.eventId, qrCode: ticketNumber, status: 'active' },
    };
  });

  const noticeId = `${id}-confirmed`;
  return createDocuments(sa, [
    { path: `bookings/${id}`, data: booking },
    ...passes,
    {
      path: `notifications/${noticeId}`,
      data: {
        id: noticeId,
        userId: order.buyerUid,
        title: 'Booking Confirmed!',
        message: `Your booking ${id} is confirmed. Your tickets are under My tickets.`,
        read: false,
        createdAt: now.toISOString(),
      },
    },
  ]);
}
