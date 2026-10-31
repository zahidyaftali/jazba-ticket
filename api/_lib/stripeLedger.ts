import Stripe from 'stripe';

// The admin portal's Payments page: every card payment, read straight from
// Stripe. Bookings are only written when the buyer's browser returns to
// /checkout/success, so Stripe is the one complete record of who paid.

export type CardPaymentStatus = 'success' | 'pending' | 'failed' | 'refunded';

export interface CardPayment {
  /** Checkout Session id (cs_…). */
  id: string;
  createdAt: string;
  /** Our order number (TT-…), which is also the booking's id. */
  orderId: string;
  eventId: string;
  eventTitle: string;
  tierName: string;
  quantity: number;
  customerName: string;
  email: string;
  /** PaymentIntent id (pi_…), '' when no card was ever entered. */
  transactionId: string;
  currency: string;
  /** In the charge currency's major unit, e.g. 1650 for Rs 1,650. */
  amount: number;
  amountRefunded: number;
  status: CardPaymentStatus;
  /** Why the card failed, when it did. */
  failure: string;
  promo: string;
  sale: string;
  receiptUrl: string;
}

/** Most sessions to read — far more than the site has had so far. */
const MAX_SESSIONS = 1000;

function statusOf(session: Stripe.Checkout.Session, pi: Stripe.PaymentIntent | null, charge: Stripe.Charge | null): CardPaymentStatus | null {
  if (session.payment_status === 'paid' || pi?.status === 'succeeded') {
    if (charge?.refunded) return 'refunded';
    return 'success';
  }
  if (session.status === 'open') return 'pending';
  // Expired: a payment record only if the buyer actually tried a card.
  // Sessions abandoned before entering a card aren't payments at all.
  if (pi && (pi.last_payment_error || pi.status === 'canceled' || pi.status === 'requires_payment_method')) return 'failed';
  return null;
}

/** Every card payment on the Stripe account, newest first. */
export async function listCardPayments(secretKey: string): Promise<CardPayment[]> {
  const stripe = new Stripe(secretKey);
  const payments: CardPayment[] = [];
  let read = 0;
  for await (const session of stripe.checkout.sessions.list({
    limit: 100,
    expand: ['data.payment_intent.latest_charge'],
  })) {
    if (++read > MAX_SESSIONS) break;
    const pi = session.payment_intent && typeof session.payment_intent === 'object' ? session.payment_intent : null;
    const charge = pi?.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
    const status = statusOf(session, pi, charge);
    if (!status) continue;
    const m = session.metadata || {};
    // Every currency we charge in (USD, GBP, PKR) has two decimals on Stripe.
    const major = (minor: number | null | undefined) => (Number(minor) || 0) / 100;
    payments.push({
      id: session.id,
      createdAt: new Date(session.created * 1000).toISOString(),
      orderId: m.order_id || '',
      eventId: m.event_id || '',
      eventTitle: m.event_title || '',
      tierName: m.tier_name || m.tier || '',
      quantity: Number(m.quantity) || 1,
      customerName: m.buyer_name || session.customer_details?.name || '',
      email: m.ticket_email || session.customer_details?.email || m.buyer_email || '',
      transactionId: pi?.id || (typeof session.payment_intent === 'string' ? session.payment_intent : ''),
      currency: (session.currency || '').toUpperCase(),
      amount: major(session.amount_total),
      amountRefunded: major(charge?.amount_refunded),
      status,
      failure: pi?.last_payment_error?.message || '',
      promo: m.promo || '',
      sale: m.sale || '',
      receiptUrl: charge?.receipt_url || '',
    });
  }
  return payments;
}
