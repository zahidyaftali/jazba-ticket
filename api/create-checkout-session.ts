// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { createCheckoutSession, getOrigin } from './_lib/stripePayment.js';

// Vercel serverless function: POST /api/create-checkout-session
// Body: { eventId, tier, quantity, promoCode?, currency, idToken, fullName? }
// Returns { url } — the caller does a full-page redirect to Stripe's own
// hosted Checkout page (window.location.href = url), so payment happens
// entirely outside this site. Stripe redirects back to
// /checkout/success?session_id=... once the buyer has paid.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Payments are not configured on the server.' });
    return;
  }

  try {
    const origin = getOrigin(req);
    const result = await createCheckoutSession(secretKey, req.body ?? {}, origin);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('create-checkout-session failed:', err?.message || err);
    res.status(err?.status || 400).json({ error: err?.message || 'Unable to start the payment.' });
  }
}
