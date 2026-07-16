// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { createTicketPaymentIntent } from './_lib/stripePayment.js';

// Vercel serverless function: POST /api/create-payment-intent
// Body: { amountUsd: number, currency: 'USD' | 'GBP' | 'PKR', name?: string, email?: string }
// Returns: { clientSecret } for Stripe.js confirmCardPayment on the client.
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
    const result = await createTicketPaymentIntent(secretKey, req.body ?? {});
    res.status(200).json(result);
  } catch (err: any) {
    console.error('create-payment-intent failed:', err?.message || err);
    res.status(400).json({ error: err?.message || 'Unable to start the payment.' });
  }
}
