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

/** Set some fields of a document, leaving the others as they are. Creates
 *  the document unless `mustExist` (then a missing one throws 'missing'). */
export async function patchDocument(
  sa: ServiceAccount | null,
  path: string,
  fields: Record<string, unknown>,
  opts: { mustExist?: boolean } = {},
): Promise<void> {
  const { docs, auth } = await endpoint(sa);
  const params = new URLSearchParams();
  for (const k of Object.keys(fields)) params.append('updateMask.fieldPaths', k);
  if (opts.mustExist) params.set('currentDocument.exists', 'true');
  const res = await fetch(`${docs}/${path.split('/').map(encodeURIComponent).join('/')}?${params.toString()}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
  });
  if (res.ok) return;
  const data: any = await res.json().catch(() => ({}));
  if (opts.mustExist && (res.status === 404 || data?.error?.status === 'NOT_FOUND')) throw new HttpError('missing', 404);
  console.error('Firestore patch failed:', res.status, path, data?.error?.message);
  throw new HttpError('Could not update the database.', 502);
}

/** Add `by` to a number field of an existing document (atomic). A missing
 *  document is left missing. */
export async function incrementField(sa: ServiceAccount | null, path: string, field: string, by = 1): Promise<boolean> {
  const { docs, auth } = await endpoint(sa);
  const base = docs.replace(/^https?:\/\/[^/]+\/v1\//, '');
  const res = await fetch(`${docs}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      writes: [
        {
          transform: { document: `${base}/${path}`, fieldTransforms: [{ fieldPath: field, increment: { integerValue: String(by) } }] },
          currentDocument: { exists: true },
        },
      ],
    }),
  });
  return res.ok;
}

/** Several writes all at once: creates (must not exist), sets (replace or
 *  create) and deletes. */
export async function commitWrites(
  sa: ServiceAccount | null,
  writes: Array<{ create?: CreateWrite; set?: CreateWrite; remove?: string }>,
): Promise<void> {
  if (!writes.length) return;
  const { docs, auth } = await endpoint(sa);
  const base = docs.replace(/^https?:\/\/[^/]+\/v1\//, '');
  for (let i = 0; i < writes.length; i += 450) {
    const res = await fetch(`${docs}:commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        writes: writes.slice(i, i + 450).map((w) =>
          w.remove
            ? { delete: `${base}/${w.remove}` }
            : w.create
              ? { update: { name: `${base}/${w.create.path}`, fields: toFirestoreFields(w.create.data) }, currentDocument: { exists: false } }
              : { update: { name: `${base}/${w.set!.path}`, fields: toFirestoreFields(w.set!.data) } },
        ),
      }),
    });
    if (!res.ok) {
      const data: any = await res.json().catch(() => ({}));
      console.error('Firestore commit failed:', res.status, data?.error?.status, data?.error?.message);
      throw new HttpError(data?.error?.status === 'ALREADY_EXISTS' ? 'exists' : 'Could not save to the database.', data?.error?.status === 'ALREADY_EXISTS' ? 409 : 502);
    }
  }
}

/** A Firestore REST value back to plain JS. */
export function fromFirestoreValue(v: any): any {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) return fromFirestoreFields(v.mapValue.fields || {});
  return undefined;
}

export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = fromFirestoreValue(v);
  return out;
}

export type DocData = Record<string, any> & { id: string };

function docFrom(d: any): DocData {
  return { ...fromFirestoreFields(d.fields || {}), id: String(d.name || '').split('/').pop() || '' };
}

/** Delete one document by path. A missing one counts as deleted. */
export async function deleteDocument(sa: ServiceAccount | null, path: string): Promise<void> {
  const { docs, auth } = await endpoint(sa);
  const res = await fetch(`${docs}/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers: { Authorization: auth } });
  if (!res.ok && res.status !== 404) {
    console.error('Firestore delete failed:', res.status, path);
    throw new HttpError('Could not update the database.', 502);
  }
}

/** One document by path ("organizers/abc"), or null when it doesn't exist. */
export async function getDocument(sa: ServiceAccount | null, path: string): Promise<DocData | null> {
  const { docs, auth } = await endpoint(sa);
  const res = await fetch(`${docs}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: { Authorization: auth } });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('Firestore get failed:', res.status, path);
    throw new HttpError('Could not read the database.', 502);
  }
  return docFrom(await res.json());
}

export type QueryFilter = { field: string; op: 'EQUAL' | 'IN'; value: unknown };

/** Documents of one collection matching every filter (an IN list is split
 *  into groups of 30, Firestore's limit). */
export async function queryDocuments(sa: ServiceAccount | null, collection: string, filters: QueryFilter[]): Promise<DocData[]> {
  const inFilter = filters.find((f) => f.op === 'IN');
  if (inFilter) {
    const values = Array.isArray(inFilter.value) ? inFilter.value : [];
    if (!values.length) return [];
    const rest = filters.filter((f) => f !== inFilter);
    const out: DocData[] = [];
    for (let i = 0; i < values.length; i += 30) {
      out.push(...(await runQuery(sa, collection, [...rest, { ...inFilter, value: values.slice(i, i + 30) }])));
    }
    return out;
  }
  return runQuery(sa, collection, filters);
}

async function runQuery(sa: ServiceAccount | null, collection: string, filters: QueryFilter[]): Promise<DocData[]> {
  const { docs, auth } = await endpoint(sa);
  const conditions = filters.map((f) => ({
    fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: toFirestoreValue(f.value) },
  }));
  const where = conditions.length === 1 ? conditions[0] : conditions.length ? { compositeFilter: { op: 'AND', filters: conditions } } : undefined;
  const res = await fetch(`${docs}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], ...(where ? { where } : {}) } }),
  });
  if (!res.ok) {
    const data: any = await res.json().catch(() => ({}));
    console.error('Firestore query failed:', res.status, collection, data?.error?.message);
    throw new HttpError('Could not read the database.', 502);
  }
  const rows: any[] = await res.json();
  return rows.filter((r) => r.document).map((r) => docFrom(r.document));
}
