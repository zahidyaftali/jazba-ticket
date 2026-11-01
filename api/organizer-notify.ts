// Vercel serverless function: POST /api/organizer-notify
// Body: { idToken, action, eventId?, organizerId?, note? }. Emails about
// organiser applications and event reviews — see api/_lib/organizerEmails.ts.
import { HttpError, verifyAccount } from './_lib/adminAuth.js';
import { serviceAccountFromEnv } from './_lib/firebaseAuthUsers.js';
import { sendOrganizerNotice } from './_lib/organizerEmails.js';
import { mailConfigFromEnv } from './_lib/sendEmail.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const account = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '');
    const mail = mailConfigFromEnv(process.env);
    if (!mail) {
      res.status(200).json({ sent: false });
      return;
    }
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set on the server.', 500);
    await sendOrganizerNotice(mail, sa, account, body);
    res.status(200).json({ sent: true });
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('organizer-notify failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not send the email right now.',
    });
  }
}
