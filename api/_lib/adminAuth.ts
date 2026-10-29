// Shared by the admin-only API routes: confirms the caller is a signed-in
// admin before anything privileged happens.

// Public Firebase web config (same values shipped in the frontend bundle).
export const FIREBASE = {
  projectId: 'gen-lang-client-0037466749',
  apiKey: 'AIzaSyBn7JXZLWICgJ4Bw6bNBUWfWQ5XAng6gdU',
  databaseId: 'ai-studio-3fd360dc-3f27-4806-97c6-a0dfddc09741',
};
// Mirrors BOOTSTRAP_ADMIN_EMAIL in src/services/backendService.ts.
const BOOTSTRAP_ADMIN_EMAIL = 'zahidyaftali999@gmail.com';

/** An error with the HTTP status the route should answer with. */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Verify a Firebase ID token and confirm the account is an admin. */
export async function verifyAdmin(idToken: string, forbiddenMessage = 'Only admins can do that.'): Promise<{ uid: string; email: string }> {
  if (!idToken) throw new HttpError('Please sign in to the admin portal again.', 401);
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data: any = await lookup.json().catch(() => ({}));
  const user = data?.users?.[0];
  if (!lookup.ok || !user?.localId) throw new HttpError('Please sign in to the admin portal again.', 401);
  const email = String(user.email || '').toLowerCase();
  if (email === BOOTSTRAP_ADMIN_EMAIL) return { uid: user.localId, email };

  // Read the caller's own profile as the caller — security rules allow that.
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}` +
    `/databases/${FIREBASE.databaseId}/documents/users/${encodeURIComponent(user.localId)}` +
    `?key=${FIREBASE.apiKey}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  const profile: any = await res.json().catch(() => ({}));
  if (!res.ok || profile?.fields?.role?.stringValue !== 'admin') throw new HttpError(forbiddenMessage, 403);
  return { uid: user.localId, email };
}
