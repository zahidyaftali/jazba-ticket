// Vercel serverless function: POST /api/stripe-webhook
// Stripe calls this when a checkout completes, so the booking is saved and
// the e-ticket emailed even when the buyer closes the tab before returning
// to the site. Nothing in the message is trusted: the checkout is fetched
// again from Stripe by its id, and only a paid one is saved (once — the
// success page may have saved it already). With STRIPE_WEBHOOK_SECRET set,
// Stripe's signature is checked as well.
import Stripe from 'stripe';
import { getOrigin } from './_lib/stripePayment.js';
import { confirmCheckoutSession } from './_lib/orderConfirmation.js';
import { mailConfigFromEnv } from './_lib/sendEmail.js';
import { serviceAccountFromEnv } from './_lib/firebaseAuthUsers.js';

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

async function readRawBody(req: any): Promise<string> {
  let raw = '';
  try {
    for await (const chunk of req) raw += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
  } catch {
    // already read by the platform; fall back to req.body
  }
  return raw;
}

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

  let event: any;
  const raw = await readRawBody(req);
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    if (raw && signingSecret) {
      event = new Stripe(secretKey).webhooks.constructEvent(raw, String(req.headers['stripe-signature'] || ''), signingSecret);
    } else {
      event = raw ? JSON.parse(raw) : typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err: any) {
    console.error('stripe-webhook: rejected message:', err?.message || err);
    res.status(400).json({ error: 'Invalid webhook message.' });
    return;
  }

  const sessionId = event?.data?.object?.id;
  if (!HANDLED.has(event?.type) || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  try {
    let serviceAccount = null;
    try {
      serviceAccount = serviceAccountFromEnv(process.env);
    } catch (err: any) {
      console.error('FIREBASE_SERVICE_ACCOUNT:', err?.message || err);
    }
    const order = await confirmCheckoutSession(secretKey, sessionId, mailConfigFromEnv(process.env), getOrigin(req), serviceAccount);
    // A paid order that couldn't be saved: answer with an error so Stripe tries again later.
    if (order.paid && !order.bookingSaved) {
      res.status(500).json({ error: 'Booking not saved yet.' });
      return;
    }
    res.status(200).json({ received: true, orderId: order.orderId, paid: order.paid });
  } catch (err: any) {
    console.error('stripe-webhook failed:', err?.message || err);
    res.status(500).json({ error: 'Could not process this checkout.' });
  }
}
