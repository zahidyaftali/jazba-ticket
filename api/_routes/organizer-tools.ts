// POST /api/organizer-tools  { idToken, action, organizerId?, ... }
// The organiser portal's server actions — see api/_lib/organizerTools.ts.
// An approved organiser acts on their own events only; an admin may pass
// organizerId to act for any organiser (Admin → Organisers → Open portal).
import { HttpError, verifyAccount } from '../_lib/adminAuth.js';
import { serviceAccountFromEnv } from '../_lib/firebaseAuthUsers.js';
import { runOrganizerTool } from '../_lib/organizerTools.js';
import { mailConfigFromEnv } from '../_lib/sendEmail.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const account = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '', 'Please sign in to the organiser portal again.');
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set on the server.', 500);
    res.status(200).json(await runOrganizerTool(sa, mailConfigFromEnv(process.env), account, body));
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('organizer-tools failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Something went wrong. Please try again.',
    });
  }
}
