// The .js extensions are required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { HttpError, verifyAdmin } from '../_lib/adminAuth.js';
import { createAuthUser, deleteAuthUser, serviceAccountFromEnv, setAuthPassword, type ServiceAccount } from '../_lib/firebaseAuthUsers.js';
import { createDocuments, deleteDocument, getDocument } from '../_lib/firestoreAdmin.js';

// Vercel serverless function: POST /api/door-staff
// Body: { idToken, action: 'create', name, email, password }
//     | { idToken, action: 'password', uid, password }
//     | { idToken, action: 'delete', uid }
// Admin-only. Door staff logins are email + password accounts with the
// 'staff' role: they can sign in to Jazba Scan (/scan) and check people in,
// nothing else (firestore.rules → isDoorCheckIn). Suspending one is an
// ordinary profile change the portal makes itself.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UID_RE = /^[A-Za-z0-9]{1,128}$/;

function passwordFrom(v: unknown): string {
  const p = typeof v === 'string' ? v : '';
  if (p.length < 8) throw new HttpError('The password needs at least 8 characters.');
  if (p.length > 128) throw new HttpError('That password is too long.');
  return p;
}

/** Only door staff logins can be changed here — never an admin's or a customer's. */
async function requireStaff(sa: ServiceAccount, uid: string): Promise<void> {
  if (!UID_RE.test(uid)) throw new HttpError('Unknown login.');
  const profile = await getDocument(sa, `users/${uid}`);
  if (!profile || profile.role !== 'staff') throw new HttpError('That account is not a door staff login.', 403);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const admin = await verifyAdmin(typeof body.idToken === 'string' ? body.idToken : '', 'Only admins can manage door staff.');
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set on the server, so logins can’t be managed.', 500);

    if (body.action === 'create') {
      const name = String(body.name || '').trim().slice(0, 80);
      const email = String(body.email || '').trim().toLowerCase();
      if (!name) throw new HttpError('Enter the staff member’s name.');
      if (!EMAIL_RE.test(email) || email.length > 128) throw new HttpError('Enter a valid email address.');
      const uid = await createAuthUser(sa, email, passwordFrom(body.password), name);
      try {
        await createDocuments(sa, [
          { path: `users/${uid}`, data: { uid, email, name, role: 'staff', status: 'active', createdAt: new Date().toISOString() } },
        ]);
      } catch (err) {
        // No half-made logins: without its profile the account can't scan.
        await deleteAuthUser(sa, uid).catch(() => undefined);
        console.error('door-staff: profile not saved:', (err as Error)?.message || err);
        throw new HttpError('Could not save the new login. Try again.', 502);
      }
      console.log(`Door staff login ${email} created by ${admin.email}.`);
      res.status(200).json({ ok: true, uid, email, name });
      return;
    }

    if (body.action === 'password') {
      const uid = String(body.uid || '');
      const password = passwordFrom(body.password);
      await requireStaff(sa, uid);
      await setAuthPassword(sa, uid, password);
      console.log(`Door staff ${uid}: password changed by ${admin.email}.`);
      res.status(200).json({ ok: true });
      return;
    }

    if (body.action === 'delete') {
      const uid = String(body.uid || '');
      await requireStaff(sa, uid);
      await deleteAuthUser(sa, uid);
      await deleteDocument(sa, `users/${uid}`);
      console.log(`Door staff ${uid}: login deleted by ${admin.email}.`);
      res.status(200).json({ ok: true });
      return;
    }

    throw new HttpError('Unknown action.');
  } catch (err: any) {
    console.error('door-staff failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not update door staff right now.',
    });
  }
}
