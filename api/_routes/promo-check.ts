// POST /api/promo-check  { code, eventId }
// Public: does an organiser's discount code work on this event right now?
// Answers with the discount and the ticket types it covers, so the event
// page and checkout can show the new total. The payment server checks the
// code again before charging (see priceOrder in _lib/stripePayment.ts).
import { HttpError } from '../_lib/adminAuth.js';
import { serviceAccountFromEnv } from '../_lib/firebaseAuthUsers.js';
import { getDocument } from '../_lib/firestoreAdmin.js';
import { PROMO_CODE_RE, lookupStoredPromo, tooManyPromoChecks } from '../_lib/promoCodes.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const code = String(body.code || '').trim().toUpperCase();
    const eventId = String(body.eventId || '');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(eventId)) throw new HttpError('Unknown event.', 404);
    if (!PROMO_CODE_RE.test(code)) {
      res.status(200).json({ ok: false, reason: 'That code isn’t valid.' });
      return;
    }
    const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (tooManyPromoChecks(ip)) throw new HttpError('Too many tries — please wait a few minutes.', 429);

    const sa = serviceAccountFromEnv(process.env);
    if (!sa && !process.env.FIRESTORE_EMULATOR_HOST) {
      res.status(200).json({ ok: false, reason: 'That code isn’t valid.' });
      return;
    }
    // Events from jazbaentertainment.com have no organiser account here, so
    // only an admin's codes can apply to them.
    const event = eventId.startsWith('wp-') ? null : await getDocument(sa, `events/${eventId}`);
    const check = await lookupStoredPromo(sa, code, eventId, String(event?.organizerId || ''));
    if (check.ok === false) {
      res.status(200).json({ ok: false, reason: (check as { reason: string }).reason });
      return;
    }
    const { promo } = check as { ok: true; promo: { code: string; rate: number; tiers: string[]; label: string } };
    res.status(200).json({ ok: true, code: promo.code, rate: promo.rate, tiers: promo.tiers, label: promo.label });
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('promo-check failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({ error: err instanceof HttpError ? err.message : 'Could not check that code.' });
  }
}
