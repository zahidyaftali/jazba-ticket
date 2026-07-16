import Stripe from 'stripe';

// Shared by the Vercel serverless function (api/create-payment-intent.ts)
// and the Vite dev-server middleware (vite.config.ts), so local dev and
// production run the exact same charge logic.

// USD → local conversion rates. Must mirror src/currency.ts so the amount
// charged always equals the total shown on screen.
const USD_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  PKR: 280,
};

export interface CreatePaymentIntentBody {
  amountUsd?: unknown;
  currency?: unknown;
  name?: unknown;
  email?: unknown;
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
  const amountUsd = Number(body.amountUsd);
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : '';
  const name = typeof body.name === 'string' ? body.name.slice(0, 200) : '';
  const email = typeof body.email === 'string' ? body.email.slice(0, 200) : '';

  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 10000) {
    throw new Error('Invalid payment amount.');
  }
  if (!(currency in USD_RATES)) {
    throw new Error('Unsupported currency.');
  }

  const stripe = new Stripe(secretKey);
  const intent = await stripe.paymentIntents.create({
    amount: toChargeAmount(amountUsd, currency),
    currency: currency.toLowerCase(),
    payment_method_types: ['card'],
    description: 'JazbaTicket order',
    receipt_email: email || undefined,
    metadata: {
      billing_name: name,
      amount_usd: amountUsd.toFixed(2),
    },
  });

  if (!intent.client_secret) {
    throw new Error('Stripe did not return a client secret.');
  }
  return { clientSecret: intent.client_secret };
}
