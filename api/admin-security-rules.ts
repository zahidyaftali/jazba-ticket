// Vercel serverless function: POST /api/admin-security-rules
// Body: { idToken, publish?: true }. Admins only. Says whether the database's
// live security rules match the tested firestore.rules, and publishes them
// when asked. See api/_lib/securityRules.ts.
import { HttpError, verifyAdmin } from './_lib/adminAuth.js';
import { serviceAccountFromEnv } from './_lib/firebaseAuthUsers.js';
import { getRulesStatus, publishRules } from './_lib/securityRules.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const admin = await verifyAdmin(typeof body.idToken === 'string' ? body.idToken : '', 'Only admins can manage database security.');
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set on the server.', 500);
    if (body.publish === true) {
      const status = await publishRules(sa);
      console.log(`Security rules published by ${admin.email}.`);
      res.status(200).json(status);
      return;
    }
    res.status(200).json(await getRulesStatus(sa));
  } catch (err: any) {
    console.error('admin-security-rules failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not check the security rules right now.',
    });
  }
}
