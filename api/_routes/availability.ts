// GET /api/availability?eventId=<id>
// Public: how many tickets are left for an event made on this site, per
// ticket type, and which types have stopped selling. Only counts — never
// who bought. Cached for a few seconds at the edge.
import { HttpError } from '../_lib/adminAuth.js';
import { eventAvailability } from '../_lib/availability.js';
import { serviceAccountFromEnv } from '../_lib/firebaseAuthUsers.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const eventId = String(req.query?.eventId || '');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(eventId) || eventId.startsWith('wp-')) throw new HttpError('Unknown event.', 404);
    const sa = serviceAccountFromEnv(process.env);
    if (!sa && !process.env.FIRESTORE_EMULATOR_HOST) throw new HttpError('Not available.', 503);
    const avail = await eventAvailability(sa, eventId);
    if (!avail) throw new HttpError('Unknown event.', 404);
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    res.status(200).json(avail);
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('availability failed:', err?.message || err);
    res.setHeader('Cache-Control', 'no-store');
    res.status(err instanceof HttpError ? err.status : 502).json({ error: err instanceof HttpError ? err.message : 'Could not check availability.' });
  }
}
