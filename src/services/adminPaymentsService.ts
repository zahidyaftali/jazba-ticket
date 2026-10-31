// Admin portal → POST /api/admin-payments (see api/admin-payments.ts):
// every card payment, read straight from Stripe.

import { auth } from '../firebase';

export interface CardPayment {
  /** Stripe Checkout Session id (cs_…). */
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
  /** Stripe PaymentIntent id (pi_…). */
  transactionId: string;
  currency: string;
  /** In the charge currency, e.g. 1650 for Rs 1,650. */
  amount: number;
  amountRefunded: number;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  failure: string;
  promo: string;
  sale: string;
  receiptUrl: string;
}

export type CardPaymentsResult = { status: 'ready'; payments: CardPayment[] } | { status: 'error'; error: string };

export async function fetchCardPayments(): Promise<CardPaymentsResult> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { status: 'error', error: 'Your admin session has expired — please sign in again.' };
    const res = await fetch('/api/admin-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'error', error: data.error || 'Could not load payments from Stripe.' };
    return { status: 'ready', payments: Array.isArray(data.payments) ? data.payments : [] };
  } catch (err) {
    console.error('fetchCardPayments failed:', err);
    return { status: 'error', error: 'Could not reach the server.' };
  }
}
