// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { submitEasypaisaOrder } from './_lib/easypaisaOrder.js';

// Vercel serverless function: POST /api/easypaisa-order
// Body: { eventId, tier, quantity, promoCode?, idToken, fullName, email, phone,
//         screenshot: { type, data (base64) } }
// Emails the order and payment screenshot to info@jazbatickets.com for manual
// verification. Returns { orderRef, amountPkr }.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Easypaisa orders are not configured on the server.' });
    return;
  }

  try {
    const result = await submitEasypaisaOrder(apiKey, req.body ?? {});
    res.status(200).json(result);
  } catch (err: any) {
    console.error('easypaisa-order failed:', err?.message || err);
    res.status(err?.status || 502).json({ error: err?.status ? err.message : 'Could not submit your payment. Please try again.' });
  }
}
