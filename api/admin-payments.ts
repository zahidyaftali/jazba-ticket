// The .js extensions are required: Vercel runs these as native ESM.
import { HttpError, verifyAdmin } from './_lib/adminAuth.js';
import { listCardPayments } from './_lib/stripeLedger.js';

// Vercel serverless function: POST /api/admin-payments   Body: { idToken }
// Admin-only. Every card payment on the Stripe account, for the admin
// portal's Payments page.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    await verifyAdmin(typeof req.body?.idToken === 'string' ? req.body.idToken : '', 'Only admins can see payments.');
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new HttpError('Stripe is not configured on the server.', 500);
    const payments = await listCardPayments(secretKey);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ payments });
  } catch (err: any) {
    console.error('admin-payments failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not load payments from Stripe right now.',
    });
  }
}
