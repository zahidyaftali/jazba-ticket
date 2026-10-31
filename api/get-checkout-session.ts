// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { getOrigin } from './_lib/stripePayment.js';
import { confirmCheckoutSession } from './_lib/orderConfirmation.js';
import { mailConfigFromEnv } from './_lib/sendEmail.js';
import { serviceAccountFromEnv } from './_lib/firebaseAuthUsers.js';

// Vercel serverless function: GET /api/get-checkout-session?session_id=cs_...
// Re-verifies a completed Checkout Session directly with Stripe (never
// trusts the redirect alone). Once paid, the server saves the booking, the
// buyer is emailed their e-ticket and info@ gets an order notice (once per
// payment). Returns the order for the success page.
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
    let serviceAccount = null;
    try {
      serviceAccount = serviceAccountFromEnv(process.env);
    } catch (err: any) {
      console.error('FIREBASE_SERVICE_ACCOUNT:', err?.message || err);
    }
    const result = await confirmCheckoutSession(secretKey, sessionId, mailConfigFromEnv(process.env), getOrigin(req), serviceAccount);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('get-checkout-session failed:', err?.message || err);
    res.status(err?.status || 400).json({ error: err?.message || 'Could not verify this payment.' });
  }
}
