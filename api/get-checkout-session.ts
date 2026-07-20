// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { getCheckoutSession } from './_lib/stripePayment.js';

// Vercel serverless function: GET /api/get-checkout-session?session_id=cs_...
// Re-verifies a completed Checkout Session directly with Stripe (never
// trusts the redirect alone) before the success page is allowed to create a
// booking. Returns the order metadata the booking is built from.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Payments are not configured on the server.' });
    return;
  }

  const sessionId = typeof req.query?.session_id === 'string' ? req.query.session_id : '';

  try {
    const result = await getCheckoutSession(secretKey, sessionId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('get-checkout-session failed:', err?.message || err);
    res.status(err?.status || 400).json({ error: err?.message || 'Could not verify this payment.' });
  }
}
