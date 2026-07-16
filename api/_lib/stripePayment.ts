import Stripe from 'stripe';

// Shared by the Vercel serverless function (api/create-payment-intent.ts)
// and the Vite dev-server middleware (vite.config.ts), so local dev and
// production run the exact same charge logic.
//
// Security model: the client only tells us WHAT it wants to buy
// (eventId / tier / quantity / promo). The price is computed here from the
// event document in Firestore, and the buyer must present a valid Firebase
// ID token — so neither the amount nor the login can be faked in the browser.

// Public Firebase web config (same values shipped in the frontend bundle).
const FIREBASE = {
  projectId: 'gen-lang-client-0037466749',
  apiKey: 'AIzaSyBn7JXZLWICgJ4Bw6bNBUWfWQ5XAng6gdU',
  databaseId: 'ai-studio-3fd360dc-3f27-4806-97c6-a0dfddc09741',
};

// USD → local conversion rates. Must mirror src/currency.ts so the amount
// charged always equals the total shown on screen.
const USD_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  PKR: 280,
};

// Must mirror the promo codes accepted in CheckoutPage.tsx (18% off).
const PROMO_CODES = new Set(['JAZBA18', 'EVENT18', 'HAMILTON18']);

export interface CreatePaymentIntentBody {
  eventId?: unknown;
  tier?: unknown;
  quantity?: unknown;
  promoCode?: unknown;
  currency?: unknown;
  idToken?: unknown;
}

class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Verify a Firebase ID token and return the signed-in user. */
async function verifyFirebaseUser(idToken: string): Promise<{ uid: string; email: string }> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  const data: any = await res.json().catch(() => ({}));
  const user = data?.users?.[0];
  if (!res.ok || !user?.localId) {
    throw new PaymentError('You must be signed in to pay. Please log in and try again.', 401);
  }
  return { uid: user.localId, email: user.email || '' };
}

/** Unwrap a Firestore REST value ({stringValue}/{integerValue}/...) to plain JS. */
function fsValue(v: any): any {
  if (v == null || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    const fields = v.mapValue?.fields || {};
    for (const k of Object.keys(fields)) out[k] = fsValue(fields[k]);
    return out;
  }
  return undefined;
}

/** Fetch a published event's pricing straight from Firestore, reading as the
 *  verified buyer (their ID token) so security rules see a signed-in user. */
async function fetchEventPricing(eventId: string, idToken: string): Promise<{ title: string; tierPrices: Record<string, number> }> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}` +
    `/databases/${FIREBASE.databaseId}/documents/events/${encodeURIComponent(eventId)}` +
    `?key=${FIREBASE.apiKey}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) throw new PaymentError('This event could not be found.', 404);
  const doc: any = await res.json();
  const f = doc?.fields || {};

  if (fsValue(f.status) !== 'published') {
    throw new PaymentError('This event is not on sale.', 400);
  }

  const basePrice = Number(fsValue(f.price)) || 0;
  const tp = fsValue(f.tierPrices) || {};
  // Same tier availability logic as getAvailableTiers() in src/types.ts.
  const tierPrices: Record<string, number> = {};
  const general = Number(tp.general) || basePrice;
  if (general > 0) tierPrices.general = general;
  if (Number(tp.vip) > 0) tierPrices.vip = Number(tp.vip);
  if (Number(tp.elite) > 0) tierPrices.elite = Number(tp.elite);

  return { title: fsValue(f.title) || 'Event', tierPrices };
}

/** Compute the USD total exactly like the checkout page displays it. */
export function computeTotalUsd(tierPrice: number, quantity: number, promoApplied: boolean): number {
  const subtotal = tierPrice * quantity;
  const discount = promoApplied ? Math.round(subtotal * 0.18) : 0;
  const fees = Math.round((subtotal - discount) * 0.08);
  return subtotal - discount + fees;
}

/** Convert a USD order total to the smallest unit of the charge currency. */
export function toChargeAmount(amountUsd: number, currency: string): number {
  if (currency === 'PKR') {
    // PKR totals are shown rounded to the rupee; charge exactly that.
    return Math.round(amountUsd * USD_RATES.PKR) * 100;
  }
  return Math.round(amountUsd * USD_RATES[currency] * 100);
}

export async function createTicketPaymentIntent(
  secretKey: string,
  body: CreatePaymentIntentBody,
): Promise<{ clientSecret: string }> {
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  const tier = typeof body.tier === 'string' ? body.tier : '';
  const quantity = Number(body.quantity);
  const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : '';
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';

  if (!eventId || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) throw new PaymentError('Invalid event.');
  if (!['general', 'vip', 'elite'].includes(tier)) throw new PaymentError('Invalid ticket type.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new PaymentError('Invalid ticket quantity.');
  if (!(currency in USD_RATES)) throw new PaymentError('Unsupported currency.');
  if (!idToken) throw new PaymentError('You must be signed in to pay. Please log in and try again.', 401);

  const user = await verifyFirebaseUser(idToken);
  const event = await fetchEventPricing(eventId, idToken);

  const tierPrice = event.tierPrices[tier];
  if (!tierPrice) throw new PaymentError('That ticket package is not available for this event.');

  const promoApplied = PROMO_CODES.has(promoCode);
  const amountUsd = computeTotalUsd(tierPrice, quantity, promoApplied);
  if (amountUsd <= 0 || amountUsd > 10000) throw new PaymentError('Invalid payment amount.');

  const stripe = new Stripe(secretKey);
  const intent = await stripe.paymentIntents.create({
    amount: toChargeAmount(amountUsd, currency),
    currency: currency.toLowerCase(),
    payment_method_types: ['card'],
    description: `JazbaTicket — ${event.title} (${tier} × ${quantity})`,
    receipt_email: user.email || undefined,
    metadata: {
      event_id: eventId,
      tier,
      quantity: String(quantity),
      promo: promoApplied ? promoCode : '',
      amount_usd: amountUsd.toFixed(2),
      buyer_uid: user.uid,
      buyer_email: user.email,
    },
  });

  if (!intent.client_secret) {
    throw new PaymentError('Stripe did not return a client secret.', 500);
  }
  return { clientSecret: intent.client_secret };
}
