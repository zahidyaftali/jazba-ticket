// Admin portal → POST /api/door-staff (see api/_routes/door-staff.ts):
// create, re-password and delete door staff logins. A door staff login can
// only sign in to Jazba Scan and check people in (firestore.rules).

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { accountEmail, auth, db } from '../firebase';

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

export async function createDoorStaff(
  name: string,
  email: string,
  password: string,
  events: string[],
): Promise<{ uid: string; email: string; name: string; events: string[] }> {
  return call({ action: 'create', name, email, password, events });
}

/** Every door staff login's events, by uid (doorStaff/<uid>.events). */
export async function getDoorStaffEvents(): Promise<Map<string, string[]>> {
  const snap = await getDocs(collection(db, 'doorStaff'));
  const m = new Map<string, string[]>();
  snap.forEach((d) => {
    const list = d.data().events;
    m.set(d.id, Array.isArray(list) ? list.filter((e: unknown): e is string => typeof e === 'string') : []);
  });
  return m;
}

/** Admin: the events this login may check tickets for (replaces the list). */
export async function setDoorStaffEvents(uid: string, events: string[]): Promise<void> {
  await setDoc(doc(db, 'doorStaff', uid), {
    uid,
    events: [...new Set(events)].slice(0, 50),
    updatedAt: new Date().toISOString(),
    updatedBy: accountEmail(auth.currentUser) || '',
  });
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
