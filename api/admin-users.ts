// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { HttpError, verifyAdmin } from './_lib/adminAuth.js';
import { listAuthUsers, serviceAccountFromEnv } from './_lib/firebaseAuthUsers.js';

// Vercel serverless function: POST /api/admin-users   Body: { idToken }
// Admin-only. Returns every sign-in account's email and sign-in method from
// Firebase Authentication, so the admin portal can show emails for Google /
// Facebook accounts whose profiles were saved without one.
// Answers { configured: false } until FIREBASE_SERVICE_ACCOUNT is set.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    await verifyAdmin(typeof req.body?.idToken === 'string' ? req.body.idToken : '', 'Only admins can see accounts.');
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) {
      res.status(200).json({ configured: false, users: [] });
      return;
    }
    const users = await listAuthUsers(sa);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ configured: true, users });
  } catch (err: any) {
    console.error('admin-users failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not load sign-in accounts right now.',
    });
  }
}
