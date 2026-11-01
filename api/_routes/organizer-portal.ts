// Vercel serverless function: POST /api/organizer-portal
// Body: { idToken, organizerId? }. An approved organiser gets the sales
// report for their own events; an admin may pass organizerId to see any
// organiser's. See api/_lib/organizerPortal.ts.
import { HttpError, verifyAccount } from '../_lib/adminAuth.js';
import { serviceAccountFromEnv } from '../_lib/firebaseAuthUsers.js';
import { organizerReport } from '../_lib/organizerPortal.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const account = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '', 'Please sign in to the organiser portal again.');
    let target = account.uid;
    if (account.isAdmin && typeof body.organizerId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.organizerId)) {
      target = body.organizerId;
    } else if (!account.isOrganizer && !account.isAdmin) {
      throw new HttpError('Your organiser account hasn’t been approved yet.', 403);
    }
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set on the server.', 500);
    res.status(200).json(await organizerReport(sa, target));
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('organizer-portal failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not load your sales right now.',
    });
  }
}
