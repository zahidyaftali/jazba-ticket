import Stripe from 'stripe';
// The .js extensions are required: Vercel runs these as native ESM.
import { USD_RATES } from './currencyRates.js';
import { WP_EVENT_PREFIX, fetchWordPressEvent, isWordPressEventOver } from './wordpressEvents.js';

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

// Promo codes: the share taken off the order and, when set, the only events
// and ticket packages (tier ids) the code works on. Must stay identical to
// PROMO_CODES in src/types.ts.
export const PROMO_CODES = new Map<string, { rate: number; eventIds?: string[]; tiers?: string[] }>([
  ['JAZBA18', { rate: 0.18 }],
  ['EVENT18', { rate: 0.18 }],
  ['HAMILTON18', { rate: 0.18 }],
  // Aa – Tenu Moaj Karawan Live: Islamabad (wp-607) and Lahore (wp-700),
  // Standard (PKR 3,000) and Standard Group (PKR 11,000) only.
  ['DAKHLAY26', { rate: 0.4, eventIds: ['wp-607', 'wp-700'], tiers: ['standard', 'standard-group'] }],
]);

// Timed sales on the listed events, from startsAt until (not including)
// endsAt. A package is charged the organiser's offer price when the post lists
// one (offerPrice), otherwise `rate` comes off. Outside the window the regular
// price applies even if the post still shows the offer. Must stay identical
// to SALES in src/types.ts.
export const SALES: { rate: number; eventIds: string[]; startsAt: string; endsAt: string }[] = [
  // Aa – Tenu Moaj Karawan Live, Lahore (wp-700): 25% off for 48 hours,
  // Sat 31 Oct 00:00 to Sun 1 Nov 2026 11:59 PM Pakistan time. The post's
  // offer prices apply (Student Group is PKR 8,500 → 7,200).
  { rate: 0.25, eventIds: ['wp-700'], startsAt: '2026-10-31T00:00:00+05:00', endsAt: '2026-11-02T00:00:00+05:00' },
];

/** The share the event's running sale takes off a package (0 when none).
 *  Same as saleRate() in src/types.ts. */
export function saleRate(eventId: string, tier: { price: number; offerPrice?: number }, now = Date.now()): number {
  const sale = SALES.find(
    (s) => s.eventIds.includes(eventId) && Date.parse(s.startsAt) <= now && now < Date.parse(s.endsAt),
  );
  if (!sale) return 0;
  const offer = tier.offerPrice;
  if (offer && offer > 0 && offer < tier.price) return 1 - offer / tier.price;
  return sale.rate;
}

/** Only VIP packages (vip, vip-group) come with a seat — every other ticket
 *  is standing. Same rule as isSeatedTier() in src/types.ts. */
export function isSeatedTier(tier: string): boolean {
  return /(^|-)vip(-|$)/.test(tier.toLowerCase());
}

/** The discount a code gives on an event's package (0.18 = 18%), or 0 when
 *  the code is unknown or doesn't cover that event or package. Same as
 *  promoRate() in src/types.ts. */
export function promoRate(code: string, eventId: string, tier: string): number {
  const promo = PROMO_CODES.get(code.trim().toUpperCase());
  if (!promo || (promo.eventIds && !promo.eventIds.includes(eventId))) return 0;
  if (promo.tiers && !promo.tiers.includes(tier)) return 0;
  return promo.rate;
}

/** What comes off an order: the event's sale or the promo code, whichever is
 *  bigger. They never add up. Same rule as orderDiscount() in src/types.ts.
 *  `code` is the promo only when it set the price. */
export function orderDiscountRate(
  promoCode: string,
  eventId: string,
  tier: string,
  pricing: { price: number; offerPrice?: number },
  now = Date.now(),
): { rate: number; code: string; sale: number } {
  const sale = saleRate(eventId, pricing, now);
  const codeRate = promoRate(promoCode, eventId, tier);
  return codeRate > sale ? { rate: codeRate, code: promoCode, sale: 0 } : { rate: sale, code: '', sale };
}

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
export async function verifyFirebaseUser(idToken: string): Promise<{ uid: string; email: string }> {
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

/** What the e-ticket prints about the event. */
export interface EventDetails {
  date: string;
  time: string;
  venue: string;
  image: string;
  category: string;
}

interface EventPricing {
  title: string;
  /** The event page on this site — where Stripe's "back" link returns to. */
  path: string;
  /** Ticket packages on sale, keyed by tier id. */
  tiers: Record<string, { price: number; name: string; offerPrice?: number }>;
  details: EventDetails;
}

/** Date line for a ticket, e.g. "15 November 2026". */
function dateLabel(fullDate: unknown, date: unknown, year: unknown): string {
  const full = typeof fullDate === 'string' ? fullDate.trim() : '';
  if (full) return full;
  return [date, year].filter((v) => typeof v === 'string' && v.trim()).join(' ');
}

/** Ticket details for an event from WordPress (also used for orders whose
 *  checkout started before event details were stored on the session). */
export function wordPressEventDetails(event: {
  fullDate?: string; date?: string; year?: string; time?: string; location?: string; image?: string; category?: string;
}): EventDetails {
  return {
    date: dateLabel(event.fullDate, event.date, event.year),
    time: event.time || '',
    venue: event.location || '',
    image: event.image || '',
    category: event.category || '',
  };
}

const DEFAULT_TIER_NAMES: Record<string, string> = { general: 'General admission', vip: 'VIP', elite: 'Elite' };

/** Pricing for an event from jazbaentertainment.com, read live from WordPress
 *  through the same mapper that builds the public listing. */
async function fetchWordPressEventPricing(eventId: string): Promise<EventPricing> {
  const event = await fetchWordPressEvent(eventId).catch((err) => {
    console.error('WordPress event lookup failed:', err?.message || err);
    throw new PaymentError('We could not load this event right now. Please try again in a moment.', 502);
  });
  if (!event) throw new PaymentError('This event could not be found.', 404);
  if (event.externalTicketUrl) throw new PaymentError('Tickets for this event are sold by our partner — use the booking link on the event page.');
  if (isWordPressEventOver(event)) throw new PaymentError('This event has ended.');

  const tiers: EventPricing['tiers'] = {};
  for (const option of event.ticketOptions || []) {
    if (option.price > 0) {
      tiers[option.id] = {
        price: option.price,
        name: option.name,
        ...(option.offerPrice ? { offerPrice: option.offerPrice } : {}),
      };
    }
  }
  if (Object.keys(tiers).length === 0) throw new PaymentError('Tickets for this event are not on sale yet.');
  return {
    title: event.title,
    path: `/events/${encodeURIComponent(event.slug || eventId)}`,
    tiers,
    details: wordPressEventDetails(event),
  };
}

/** Fetch a published event's pricing straight from Firestore, reading as the
 *  verified buyer (their ID token) so security rules see a signed-in user. */
export async function fetchEventPricing(eventId: string, idToken: string): Promise<EventPricing> {
  if (eventId.startsWith(WP_EVENT_PREFIX)) return fetchWordPressEventPricing(eventId);

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
  const tiers: EventPricing['tiers'] = {};
  const general = Number(tp.general) || basePrice;
  if (general > 0) tiers.general = { price: general, name: DEFAULT_TIER_NAMES.general };
  if (Number(tp.vip) > 0) tiers.vip = { price: Number(tp.vip), name: DEFAULT_TIER_NAMES.vip };
  if (Number(tp.elite) > 0) tiers.elite = { price: Number(tp.elite), name: DEFAULT_TIER_NAMES.elite };

  // The page redirects an id link to its readable /events/<slug> URL.
  return {
    title: fsValue(f.title) || 'Event',
    path: `/events/${encodeURIComponent(eventId)}`,
    tiers,
    details: {
      date: dateLabel(fsValue(f.fullDate), fsValue(f.date), fsValue(f.year)),
      time: String(fsValue(f.time) || ''),
      venue: String(fsValue(f.location) || ''),
      image: String(fsValue(f.image) || ''),
      category: String(fsValue(f.category) || ''),
    },
  };
}

/** Compute the USD total exactly like the checkout page displays it —
 *  must stay identical to computeOrderTotals() in src/types.ts. No rounding
 *  in USD: prices converted from PKR/GBP only come out exact in the buyer's
 *  currency, and toChargeAmount() rounds once, at the end. */
export function computeTotalUsd(tierPrice: number, quantity: number, discountRate: number): number {
  const subtotal = tierPrice * quantity;
  const discount = subtotal * discountRate;
  return subtotal - discount;
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
  /** The email typed at checkout — where the e-ticket is sent. */
  email?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Stripe metadata values are capped at 500 characters. */
const meta = (value: string) => (value.length > 500 ? '' : value);

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
  const typedEmail = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';

  if (!eventId || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) throw new PaymentError('Invalid event.');
  if (!/^[a-z0-9-]{1,64}$/.test(tier)) throw new PaymentError('Invalid ticket type.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new PaymentError('Invalid ticket quantity.');
  if (!(currency in USD_RATES)) throw new PaymentError('Unsupported currency.');
  if (!idToken) throw new PaymentError('You must be signed in to pay. Please log in and try again.', 401);

  const user = await verifyFirebaseUser(idToken);
  const event = await fetchEventPricing(eventId, idToken);

  const selected = Object.prototype.hasOwnProperty.call(event.tiers, tier) ? event.tiers[tier] : undefined;
  if (!selected) throw new PaymentError('That ticket package is not available for this event.');

  const discount = orderDiscountRate(promoCode, eventId, tier, selected);
  const promoApplied = discount.code !== '';
  const salePercent = discount.sale ? `${Math.round(discount.sale * 100)}%` : '';
  const amountUsd = computeTotalUsd(selected.price, quantity, discount.rate);
  if (amountUsd <= 0 || amountUsd > 10000) throw new PaymentError('Invalid payment amount.');

  // The e-ticket goes to the email typed at checkout (it starts out as the
  // login email); the login email gets a copy when the two differ.
  const ticketEmail = EMAIL_RE.test(typedEmail) ? typedEmail : user.email;

  // Only VIP tickets are seated; everything else is standing, so no seat.
  const seat = isSeatedTier(tier)
    ? `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}-${Math.floor(1 + Math.random() * 24)}`
    : '';
  // A stable, human-readable order number, later reused as the Firestore
  // booking doc id — so a refreshed success page overwrites the same
  // document instead of creating a duplicate booking.
  const orderId = `TT-${Math.floor(100000 + Math.random() * 900000)}`;
  const tierLabel = selected.name;

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
            description: `Jazba Tickets order${promoApplied ? ' — promo applied' : salePercent ? ` — ${salePercent} off sale` : ''}`,
          },
        },
      },
    ],
    customer_email: ticketEmail || undefined,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${event.path}`,
    metadata: {
      order_id: orderId,
      event_id: eventId,
      tier,
      tier_name: tierLabel,
      quantity: String(quantity),
      promo: promoApplied ? promoCode : '',
      sale: salePercent,
      amount_usd: amountUsd.toFixed(2),
      buyer_uid: user.uid,
      buyer_email: user.email,
      buyer_name: fullName,
      ticket_email: ticketEmail,
      seat,
      // Printed on the e-ticket emailed once the payment goes through.
      event_title: meta(event.title),
      event_date: meta(event.details.date),
      event_time: meta(event.details.time),
      event_venue: meta(event.details.venue),
      event_image: meta(event.details.image),
      event_category: meta(event.details.category),
    },
  });

  if (!session.url) throw new PaymentError('Stripe did not return a checkout URL.', 500);
  return { url: session.url };
}

export interface VerifiedCheckoutSession {
  paid: boolean;
  orderId: string;
  eventId: string;
  tier: string;
  tierName: string;
  quantity: number;
  seat: string;
  buyerUid: string;
  /** The login email of the account that paid. */
  buyerEmail: string;
  /** Where the e-ticket goes — the email typed at checkout. */
  ticketEmail: string;
  buyerName: string;
  amountUsd: number;
  promoApplied: boolean;
}

/** Order details from a Checkout Session's metadata. */
export function readCheckoutSession(session: Stripe.Checkout.Session): VerifiedCheckoutSession {
  const m = session.metadata || {};
  const tier = /^[a-z0-9-]{1,64}$/.test(m.tier || '') ? m.tier : 'general';
  const buyerEmail = m.buyer_email || session.customer_details?.email || '';
  return {
    paid: session.payment_status === 'paid',
    orderId: m.order_id || session.id,
    eventId: m.event_id || '',
    tier,
    tierName: m.tier_name || DEFAULT_TIER_NAMES[tier] || tier,
    quantity: Number(m.quantity) || 1,
    seat: isSeatedTier(tier) ? m.seat || '' : '',
    buyerUid: m.buyer_uid || '',
    buyerEmail,
    ticketEmail: m.ticket_email || buyerEmail,
    buyerName: m.buyer_name || '',
    amountUsd: Number(m.amount_usd) || 0,
    promoApplied: !!m.promo,
  };
}

/** Re-verify a Checkout Session with Stripe (server-to-server) — the success
 *  page never trusts the redirect alone. The payment is expanded so the
 *  order emails can record on it that they were sent. */
export async function retrieveCheckoutSession(
  secretKey: string,
  sessionId: string,
): Promise<{ stripe: Stripe; session: Stripe.Checkout.Session; order: VerifiedCheckoutSession }> {
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    throw new PaymentError('Invalid checkout session.');
  }
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  return { stripe, session, order: readCheckoutSession(session) };
}
