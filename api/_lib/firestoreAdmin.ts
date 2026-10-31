// Server-side Firestore writes with the Firebase service account
// (FIREBASE_SERVICE_ACCOUNT). These skip the security rules, which is the
// point: orders are written only here, after Stripe has confirmed payment,
// so a visitor's browser can never create a "paid" booking itself.

import { FIREBASE, HttpError } from './adminAuth.js';
import { serviceAccountToken, type ServiceAccount } from './firebaseAuthUsers.js';

type FirestoreValue = Record<string, unknown>;

/** A plain JS value as a Firestore REST value. `undefined` fields are left out. */
export function toFirestoreValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFirestoreFields(v as Record<string, unknown>) } };
  return { stringValue: String(v) };
}

export function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const out: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = toFirestoreValue(v);
  return out;
}

/** Where Firestore lives, and how to sign the request. Tests point it at
 *  the local emulator with FIRESTORE_EMULATOR_HOST. */
async function endpoint(sa: ServiceAccount | null): Promise<{ docs: string; auth: string }> {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  const project = emulator ? process.env.FIRESTORE_EMULATOR_PROJECT || FIREBASE.projectId : FIREBASE.projectId;
  const root = emulator ? `http://${emulator}` : 'https://firestore.googleapis.com';
  const database = emulator ? '(default)' : FIREBASE.databaseId;
  const docs = `${root}/v1/projects/${project}/databases/${database}/documents`;
  if (emulator) return { docs, auth: 'Bearer owner' };
  if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set on the server.', 500);
  return { docs, auth: `Bearer ${await serviceAccountToken(sa)}` };
}

export interface CreateWrite {
  /** e.g. "bookings/TT-AB12CD34" */
  path: string;
  data: Record<string, unknown>;
}

/** Create documents all together, or none of them: fails with 'exists'
 *  when any of them is already there (so a repeat call changes nothing). */
export async function createDocuments(sa: ServiceAccount | null, writes: CreateWrite[]): Promise<'created' | 'exists'> {
  const { docs, auth } = await endpoint(sa);
  const base = docs.replace(/^https?:\/\/[^/]+\/v1\//, '');
  const res = await fetch(`${docs}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      writes: writes.map((w) => ({
        update: { name: `${base}/${w.path}`, fields: toFirestoreFields(w.data) },
        currentDocument: { exists: false },
      })),
    }),
  });
  if (res.ok) return 'created';
  const data: any = await res.json().catch(() => ({}));
  const status = data?.error?.status || '';
  if (status === 'ALREADY_EXISTS' || status === 'FAILED_PRECONDITION' || res.status === 409) return 'exists';
  console.error('Firestore commit failed:', res.status, status, data?.error?.message);
  throw new HttpError('Could not save the order to the database.', 502);
}
