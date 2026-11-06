// Admin portal → POST /api/door-staff (see api/_routes/door-staff.ts):
// create, re-password and delete door staff logins. A door staff login can
// only sign in to Jazba Scan and check people in (firestore.rules).

import { auth } from '../firebase';

async function call(body: Record<string, unknown>): Promise<any> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Your admin session has expired. Please sign in again.');
  let res: Response;
  try {
    res = await fetch('/api/door-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, idToken }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export async function createDoorStaff(name: string, email: string, password: string): Promise<{ uid: string; email: string; name: string }> {
  return call({ action: 'create', name, email, password });
}

export async function setDoorStaffPassword(uid: string, password: string): Promise<void> {
  await call({ action: 'password', uid, password });
}

export async function deleteDoorStaff(uid: string): Promise<void> {
  await call({ action: 'delete', uid });
}

/** An easy-to-read password for a gate login, e.g. "gate-7K3M-9QX2". */
export function suggestPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `gate-${chars.slice(0, 4)}-${chars.slice(4)}`;
}
