// The organiser portal's newer tools, and the public pieces that go with them.
//
// Server actions (POST /api/organizer-tools — see api/_lib/organizerTools.ts):
// door staff logins, issuing / resending / cancelling tickets, waitlist emails.
// Direct database (firestore.rules keep each organiser to their own):
// discount codes (promoCodes) and private details (organizerPrivate).
// Public: tickets left (GET /api/availability), joining a waitlist, checking
// a discount code (POST /api/promo-check), a buyer's own ticket PDF.

import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { PROMO_CODES, registerPromo } from '../types';

async function post(url: string, body: Record<string, unknown>, needAuth = true): Promise<any> {
  const idToken = needAuth ? await auth.currentUser?.getIdToken() : undefined;
  if (needAuth && !idToken) throw new Error('Please sign in again.');
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, ...(idToken ? { idToken } : {}) }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

/** One organiser-portal server action. `organizerId` only when an admin acts for an organiser. */
export function organizerTool<T = any>(action: string, body: Record<string, unknown> = {}, organizerId = ''): Promise<T> {
  return post('/api/organizer-tools', { action, ...body, ...(organizerId ? { organizerId } : {}) });
}

// ── Door staff ────────────────────────────────────────────────────────────

export interface StaffLogin {
  uid: string;
  name: string;
  email: string;
  status: string;
  events: string[];
  createdAt?: string;
}

export const listStaffLogins = (organizerId = '') =>
  organizerTool<{ staff: StaffLogin[] }>('staff-list', {}, organizerId).then((r) => r.staff || []);
export const createStaffLogin = (input: { name: string; email: string; password: string; events: string[] }, organizerId = '') =>
  organizerTool<StaffLogin>('staff-create', input, organizerId);
export const setStaffEvents = (uid: string, events: string[], organizerId = '') => organizerTool('staff-events', { uid, events }, organizerId);
export const setStaffPassword = (uid: string, password: string, organizerId = '') => organizerTool('staff-password', { uid, password }, organizerId);
export const setStaffStatus = (uid: string, status: 'active' | 'suspended', organizerId = '') => organizerTool('staff-status', { uid, status }, organizerId);
export const deleteStaffLogin = (uid: string, organizerId = '') => organizerTool('staff-delete', { uid }, organizerId);

// ── Tickets the organiser issues ──────────────────────────────────────────

export const issueOrganizerTicket = (
  input: { eventId: string; tier: string; quantity: number; name: string; email: string; phone?: string; note?: string; send: boolean },
  organizerId = '',
) => organizerTool<{ orderId: string; emailed: boolean }>('issue-ticket', input, organizerId);
export const resendOrganizerTicket = (orderId: string, to = '', organizerId = '') =>
  organizerTool<{ sentTo: string }>('resend-ticket', { orderId, to }, organizerId);
export const cancelOrganizerTicket = (orderId: string, organizerId = '') => organizerTool('cancel-ticket', { orderId }, organizerId);

// ── Waitlist ──────────────────────────────────────────────────────────────

export const notifyWaitlist = (eventId: string, message = '', organizerId = '') =>
  organizerTool<{ notified: number }>('waitlist-notify', { eventId, message }, organizerId);
export const removeWaitlistEntry = (id: string, organizerId = '') => organizerTool('waitlist-remove', { id }, organizerId);

/** Public: put your name down for a sold-out event. 'joined' or 'already'. */
export async function joinWaitlist(eventId: string, input: { name: string; email: string; tier?: string }): Promise<'joined' | 'already'> {
  const email = input.email.trim().toLowerCase();
  const key = email.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  const id = `${eventId}__${key.length >= 3 ? key : `${key}---`}`;
  try {
    await setDoc(doc(db, 'waitlist', id), {
      eventId,
      name: input.name.trim().slice(0, 100),
      email,
      tier: (input.tier || '').slice(0, 64),
      userId: auth.currentUser?.uid || '',
      createdAt: new Date().toISOString(),
      status: 'waiting',
    });
    return 'joined';
  } catch (err: any) {
    // An entry for this email already exists (the rules allow creating it once).
    if (err?.code === 'permission-denied') return 'already';
    throw err;
  }
}

// ── Tickets left ──────────────────────────────────────────────────────────

export interface TierAvailability {
  capacity: number;
  sold: number;
  left: number | null;
  salesEnd: string;
  salesEnded: boolean;
}
export interface EventAvailability {
  eventId: string;
  capacity: number;
  sold: number;
  left: number | null;
  tiers: Record<string, TierAvailability>;
  soldOut: boolean;
  checkedAt: string;
}

export async function fetchAvailability(eventId: string): Promise<EventAvailability | null> {
  if (!eventId || eventId.startsWith('wp-')) return null;
  try {
    const res = await fetch(`/api/availability?eventId=${encodeURIComponent(eventId)}`);
    if (!res.ok) return null;
    return (await res.json()) as EventAvailability;
  } catch {
    return null;
  }
}

// ── Discount codes ────────────────────────────────────────────────────────

export interface PromoCodeDoc {
  code: string;
  organizerId: string;
  eventIds: string[];
  tiers: string[];
  percentOff: number;
  maxUses: number;
  uses: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export const PROMO_RE = /^[A-Z0-9]{3,24}$/;

export async function listPromoCodes(organizerId: string): Promise<PromoCodeDoc[]> {
  const snap = await getDocs(query(collection(db, 'promoCodes'), where('organizerId', '==', organizerId)));
  return snap.docs.map((d) => d.data() as PromoCodeDoc).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Create a code. Fails with 'taken' when the code already exists anywhere. */
export async function createPromoCode(input: Omit<PromoCodeDoc, 'uses' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const code = input.code.trim().toUpperCase();
  if (!PROMO_RE.test(code)) throw new Error('Codes are 3–24 letters and numbers, no spaces.');
  if (PROMO_CODES.has(code)) throw new Error('taken');
  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, 'promoCodes', code), { ...input, code, uses: 0, createdAt: now, updatedAt: now });
  } catch (err: any) {
    if (err?.code === 'permission-denied') throw new Error('taken');
    throw err;
  }
}

export async function updatePromoCode(code: string, patch: Partial<PromoCodeDoc>): Promise<void> {
  const { uses: _uses, code: _code, organizerId: _org, createdAt: _c, ...rest } = patch;
  await updateDoc(doc(db, 'promoCodes', code), { ...rest, updatedAt: new Date().toISOString() });
}

export async function deletePromoCode(code: string): Promise<void> {
  await deleteDoc(doc(db, 'promoCodes', code));
}

/** Public: does this code work on the event? Organisers' codes are checked
 *  by the server and then work like the built-in ones on this page. */
export async function checkPromoCode(code: string, eventId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const clean = code.trim().toUpperCase();
  try {
    const data = await post('/api/promo-check', { code: clean, eventId }, false);
    if (!data.ok) return { ok: false, reason: data.reason || 'That code isn’t valid.' };
    registerPromo(clean, { rate: Number(data.rate) || 0, eventIds: [eventId], ...(data.tiers?.length ? { tiers: data.tiers } : {}) });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.message || 'That code isn’t valid.' };
  }
}

// ── Private organiser details ─────────────────────────────────────────────

export interface PayoutDetails {
  method: 'uk' | 'iban' | 'pk' | 'other';
  accountName: string;
  bankName?: string;
  sortCode?: string;
  accountNumber?: string;
  iban?: string;
  bic?: string;
  notes?: string;
}

export interface OrganizerPrivate {
  payout?: PayoutDetails;
  notifyOnSale?: boolean;
  applicationNote?: string;
  feePercent?: number;
  reviewNote?: string;
  updatedAt?: string;
}

export async function getOrganizerPrivate(organizerId: string): Promise<OrganizerPrivate | null> {
  try {
    const snap = await getDoc(doc(db, 'organizerPrivate', organizerId));
    return snap.exists() ? (snap.data() as OrganizerPrivate) : null;
  } catch {
    return null;
  }
}

/** Save the organiser's own private fields (never the fee or review note). */
export async function saveOrganizerPrivate(organizerId: string, patch: Pick<OrganizerPrivate, 'payout' | 'notifyOnSale' | 'applicationNote'>): Promise<void> {
  const clean: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.payout) clean.payout = Object.fromEntries(Object.entries(patch.payout).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, String(v).slice(0, 120)]));
  if (typeof patch.notifyOnSale === 'boolean') clean.notifyOnSale = patch.notifyOnSale;
  if (typeof patch.applicationNote === 'string') clean.applicationNote = patch.applicationNote.slice(0, 3000);
  await setDoc(doc(db, 'organizerPrivate', organizerId), clean, { merge: true });
}

// ── Buyer: download your own ticket ───────────────────────────────────────

export async function downloadMyTicket(orderId: string): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Please sign in again.');
  const res = await fetch('/api/my-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, orderId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'The ticket could not be downloaded.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Jazba-Ticket-${orderId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
