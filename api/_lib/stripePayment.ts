import Stripe from 'stripe';

// Shared by the Vercel serverless functions (api/create-checkout-session.ts,
// api/get-checkout-session.ts) and the Vite dev-server middleware
// (vite.config.ts), so local dev and production run the exact same logic.
//
// Security model: the client only tells us WHAT it wants to buy
// (eventId / tier / quantity / promo). The price is computed here from the
// event document in Firestore, and the buyer must present a valid Firebase
// ID token — so neither the amount nor the login can be faked in the browser.
//
// Payment itself happens entirely on Stripe's own hosted Checkout page
// (outside this site). We create a Checkout Session with the verified order
// details, the buyer pays on checkout.stripe.com, and Stripe redirects them
// back to /checkout/success?session_id=... where getCheckoutSession() below
// re-verifies the payment before a booking is ever written.

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

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Derive the site origin from request headers — never trust a client-supplied value. */
export function getOrigin(req: any): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'jazbatickets.com';
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isLocal = String(host).startsWith('localhost') || String(host).startsWith('127.0.0.1');
  const proto = forwardedProto || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
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

export interface CreateCheckoutSessionBody {
  eventId?: unknown;
  tier?: unknown;
  quantity?: unknown;
  promoCode?: unknown;
  currency?: unknown;
  idToken?: unknown;
  fullName?: unknown;
}

/** Create a Stripe-hosted Checkout Session — the buyer pays on Stripe's own
 *  page, entirely outside this site, then is redirected back to /checkout/success. */
export async function createCheckoutSession(
  secretKey: string,
  body: CreateCheckoutSessionBody,
  origin: string,
): Promise<{ url: string }> {
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  const tier = typeof body.tier === 'string' ? body.tier : '';
  const quantity = Number(body.quantity);
  const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : '';
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 200) : '';

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

  const seat = `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}-${Math.floor(1 + Math.random() * 24)}`;
  // A stable, human-readable order number, later reused as the Firestore
  // booking doc id — so a refreshed success page overwrites the same
  // document instead of creating a duplicate booking.
  const orderId = `TT-${Math.floor(100000 + Math.random() * 900000)}`;
  const tierLabel = tier === 'elite' ? 'Elite' : tier === 'vip' ? 'VIP' : 'General admission';

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toChargeAmount(amountUsd, currency),
          product_data: {
            name: `${event.title} — ${tierLabel} × ${quantity}`,
            description: `Jazba Tickets order${promoApplied ? ' — promo applied' : ''}, includes service fee`,
          },
        },
      },
    ],
    customer_email: user.email || undefined,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${encodeURIComponent(eventId)}`,
    metadata: {
      order_id: orderId,
      event_id: eventId,
      tier,
      quantity: String(quantity),
      promo: promoApplied ? promoCode : '',
      amount_usd: amountUsd.toFixed(2),
      buyer_uid: user.uid,
      buyer_email: user.email,
      buyer_name: fullName,
      seat,
    },
  });

  if (!session.url) throw new PaymentError('Stripe did not return a checkout URL.', 500);
  return { url: session.url };
}

export interface VerifiedCheckoutSession {
  paid: boolean;
  orderId: string;
  eventId: string;
  tier: 'general' | 'vip' | 'elite';
  quantity: number;
  seat: string;
  buyerUid: string;
  buyerEmail: string;
  buyerName: string;
  amountUsd: number;
  promoApplied: boolean;
}

/** Re-verify a completed Checkout Session with Stripe (server-to-server) —
 *  the success page never trusts the redirect alone. */
export async function getCheckoutSession(secretKey: string, sessionId: string): Promise<VerifiedCheckoutSession> {
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    throw new PaymentError('Invalid checkout session.');
  }
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const m = session.metadata || {};
  const tier = m.tier === 'vip' || m.tier === 'elite' ? m.tier : 'general';

  return {
    paid: session.payment_status === 'paid',
    orderId: m.order_id || sessionId,
    eventId: m.event_id || '',
    tier,
    quantity: Number(m.quantity) || 1,
    seat: m.seat || '',
    buyerUid: m.buyer_uid || '',
    buyerEmail: m.buyer_email || session.customer_details?.email || '',
    buyerName: m.buyer_name || '',
    amountUsd: Number(m.amount_usd) || 0,
    promoApplied: !!m.promo,
  };
}
