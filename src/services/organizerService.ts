// Event organisers: sign-up (an application an admin approves), their own
// profile and events, their sales (read through the server), and the
// admin's review actions. The security rules in firestore.rules decide what
// each side may change — this file only calls what they allow.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { OrganizerProfile } from './backendService';

export type OrganizerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/** Profiles an admin made before sign-ups existed have no status. */
export function organizerStatus(org: Pick<OrganizerProfile, 'status'> | null | undefined): OrganizerStatus {
  return org?.status || 'approved';
}

/** Event types an organiser can tick on their application and profile. */
export const EVENT_TYPES = ['Concerts', 'Qawwali & Sufi nights', 'Comedy', 'Theatre', 'Festivals', 'Club nights', 'Conferences', 'Community & charity', 'Sports', 'Family'];

export const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'youtube', 'x'] as const;
export const SOCIAL_LABELS: Record<(typeof SOCIAL_KEYS)[number], string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X (Twitter)',
};

/** What an organiser may write on their own profile (firestore.rules → isValidOrganizer). */
export interface OrganizerDetails {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  description: string;
  specialties: string[];
  socialLinks: Record<string, string>;
  logoUrl: string;
  bannerUrl: string;
  applicationNote: string;
}

function cleanDetails(d: Partial<OrganizerDetails>): Partial<OrganizerDetails> {
  const out: Record<string, unknown> = {};
  const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  if (d.companyName !== undefined) out.companyName = str(d.companyName, 120);
  if (d.contactName !== undefined) out.contactName = str(d.contactName, 120);
  if (d.email !== undefined) out.email = str(d.email, 254);
  if (d.phone !== undefined) out.phone = str(d.phone, 40);
  if (d.website !== undefined) out.website = str(d.website, 512);
  if (d.location !== undefined) out.location = str(d.location, 120);
  if (d.description !== undefined) out.description = str(d.description, 5000);
  if (d.applicationNote !== undefined) out.applicationNote = str(d.applicationNote, 3000);
  if (d.logoUrl !== undefined) out.logoUrl = str(d.logoUrl, 1024);
  if (d.bannerUrl !== undefined) out.bannerUrl = str(d.bannerUrl, 1024);
  if (d.specialties !== undefined) out.specialties = d.specialties.map((s) => str(s, 60)).filter(Boolean).slice(0, 12);
  if (d.socialLinks !== undefined) {
    const links: Record<string, string> = {};
    for (const k of SOCIAL_KEYS) {
      const v = str(d.socialLinks[k], 300);
      if (v) links[k] = v;
    }
    out.socialLinks = links;
  }
  return out as Partial<OrganizerDetails>;
}

export async function getMyOrganizer(uid: string): Promise<OrganizerProfile | null> {
  const snap = await getDoc(doc(db, 'organizers', uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as OrganizerProfile) : null;
}

/** Send an application: the caller's own organizers/<uid>, as "pending". */
export async function applyAsOrganizer(uid: string, details: OrganizerDetails): Promise<OrganizerProfile> {
  const now = new Date().toISOString();
  const profile = { ...cleanDetails(details), id: uid, userId: uid, status: 'pending' as const, createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'organizers', uid), profile);
  notifyOrganizerEmail('applied');
  return profile as OrganizerProfile;
}

/** Edit the caller's own profile; `resubmit` sends a rejected application again. */
export async function updateMyOrganizer(uid: string, details: Partial<OrganizerDetails>, resubmit = false): Promise<void> {
  await updateDoc(doc(db, 'organizers', uid), {
    ...cleanDetails(details),
    updatedAt: new Date().toISOString(),
    ...(resubmit ? { status: 'pending' } : {}),
  });
  if (resubmit) notifyOrganizerEmail('applied');
}

// ── Events ────────────────────────────────────────────────────────────────

export async function getOrganizerEvents(uid: string): Promise<any[]> {
  const snap = await getDocs(query(collection(db, 'events'), where('organizerId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Create or update one of the organiser's events. Returns its id. */
export async function saveOrganizerEvent(eventId: string | null, payload: Record<string, any>): Promise<string> {
  const now = new Date().toISOString();
  if (eventId) {
    await updateDoc(doc(db, 'events', eventId), { ...payload, updatedAt: now });
    return eventId;
  }
  const ref = doc(collection(db, 'events'));
  await setDoc(ref, { ...payload, id: ref.id, type: 'upcoming', createdAt: now, updatedAt: now });
  return ref.id;
}

export async function deleteOrganizerEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

// ── Sales (server) ────────────────────────────────────────────────────────

export interface OrganizerTierStats {
  name: string;
  sold: number;
  revenueUsd: number;
}
export interface OrganizerEventStats {
  id: string;
  title: string;
  status: string;
  date: string;
  image: string;
  venue: string;
  capacity: number;
  ticketsSold: number;
  revenueUsd: number;
  orders: number;
  passes: number;
  checkedIn: number;
  tiers: OrganizerTierStats[];
}
export interface OrganizerOrder {
  id: string;
  eventId: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  tierName: string;
  quantity: number;
  amountUsd: number;
  currency: string;
  amountLocal: number;
  createdAt: string;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  source: 'online' | 'admin';
}
export interface OrganizerReport {
  organizerId: string;
  events: OrganizerEventStats[];
  orders: OrganizerOrder[];
  totals: { revenueUsd: number; ticketsSold: number; orders: number; checkedIn: number; followers: number; liveEvents: number };
  generatedAt: string;
}

/** The organiser's sales. Admins may pass an organiser's uid. */
export async function fetchOrganizerReport(organizerId?: string): Promise<OrganizerReport> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Please sign in again.');
  let res: Response;
  try {
    res = await fetch('/api/organizer-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...(organizerId ? { organizerId } : {}) }),
    });
  } catch {
    throw new Error('Could not reach the server.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load sales right now.');
  return data as OrganizerReport;
}

/** Fire-and-forget email (application received, event submitted, decisions). */
export function notifyOrganizerEmail(
  action: 'applied' | 'event-submitted' | 'decision' | 'event-decision',
  extra: { eventId?: string; organizerId?: string; note?: string } = {},
): void {
  (async () => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    const res = await fetch('/api/organizer-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, action, ...extra }),
    });
    if (!res.ok) console.warn('organizer-notify:', action, res.status, await res.text().catch(() => ''));
  })().catch((err) => console.warn('organizer-notify failed:', err));
}

// ── Admin review ──────────────────────────────────────────────────────────

/**
 * Approve, reject, suspend or reinstate an organiser. Approving gives their
 * account the organiser role (what lets them create events); anything else
 * takes it away. An admin account is never demoted.
 */
export async function reviewOrganizer(
  org: OrganizerProfile,
  status: OrganizerStatus,
  note = '',
  accountRole?: string,
): Promise<void> {
  if (!org.id) throw new Error('This organiser has no id.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'organizers', org.id), {
    status,
    reviewNote: note.trim().slice(0, 2000),
    reviewedAt: new Date().toISOString(),
  });
  if (org.userId && accountRole && accountRole !== 'admin') {
    const role = status === 'approved' ? 'organizer' : 'user';
    if (role !== accountRole) batch.update(doc(db, 'users', org.userId), { role });
  }
  await batch.commit();
  if (status !== 'pending') notifyOrganizerEmail('decision', { organizerId: org.id, note });
}

/** Publish an organiser's event, or send it back to them with a note. */
export async function reviewEvent(eventId: string, decision: 'publish' | 'decline' | 'unpublish', note = ''): Promise<void> {
  const update =
    decision === 'publish'
      ? { status: 'published', everPublished: true, reviewNote: '', reviewedAt: new Date().toISOString() }
      : { status: 'draft', reviewNote: note.trim().slice(0, 2000), reviewedAt: new Date().toISOString() };
  await updateDoc(doc(db, 'events', eventId), update);
  if (decision !== 'unpublish') notifyOrganizerEmail('event-decision', { eventId, note });
}

export interface FollowRow {
  id: string;
  followerId: string;
  createdAt: string;
}

export async function getFollowers(targetType: 'organizer' | 'artist', targetId: string): Promise<FollowRow[]> {
  const snap = await getDocs(
    query(collection(db, 'follows'), where('targetType', '==', targetType), where('targetId', '==', targetId)),
  );
  return snap.docs.map((d) => ({ id: d.id, followerId: String(d.data().followerId || ''), createdAt: String(d.data().createdAt || '') }));
}

export async function removeFollower(followId: string): Promise<void> {
  await deleteDoc(doc(db, 'follows', followId));
}

/** Delete an organiser profile; a self-registered organiser's account also
 *  loses the organiser role (their events stay, owned by nobody new). */
export async function deleteOrganizer(org: OrganizerProfile, accountRole?: string): Promise<void> {
  if (!org.id) throw new Error('This organiser has no id.');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'organizers', org.id));
  if (org.status && org.userId && accountRole === 'organizer') batch.update(doc(db, 'users', org.userId), { role: 'user' });
  await batch.commit();
}

/** A self-registered organiser (organizers/<their uid>), as opposed to a
 *  profile an admin typed in before sign-ups existed. */
export function isSelfRegistered(org: Pick<OrganizerProfile, 'id' | 'userId' | 'status'>): boolean {
  return !!org.status && !!org.userId && org.id === org.userId;
}

/** The events an organiser is behind: their own for a self-registered
 *  organiser; for an admin-made profile, events naming it as organiser. */
export function eventsOfOrganizer<T extends { organizerId?: string; organizerName?: string }>(org: OrganizerProfile, events: T[]): T[] {
  if (isSelfRegistered(org)) return events.filter((e) => e.organizerId === org.userId);
  const name = (org.companyName || '').trim().toLowerCase();
  return name ? events.filter((e) => (e.organizerName || '').trim().toLowerCase() === name) : [];
}

// ── Delete with clean-up ──────────────────────────────────────────────────

export interface DeleteOrganizerPlan {
  /** Their events with no orders — deleted when `deleteUnsold` is set. */
  unsoldEventIds: string[];
  /** Their events that have orders — kept (orders point at them). */
  soldEventIds: string[];
  /** Follow documents pointing at this organiser — always removed. */
  followIds: string[];
  deleteUnsold: boolean;
  /** Take events that have orders off sale (tickets already sold stay valid). */
  takeSoldOffSale: boolean;
  accountRole?: string;
}

/** Delete an organiser and tidy up after them, in batches of up to 400 writes. */
export async function deleteOrganizerWithCleanup(org: OrganizerProfile, plan: DeleteOrganizerPlan): Promise<void> {
  if (!org.id) throw new Error('This organiser has no id.');
  const writes: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
  if (plan.deleteUnsold) for (const id of plan.unsoldEventIds) writes.push((b) => b.delete(doc(db, 'events', id)));
  if (plan.takeSoldOffSale) {
    for (const id of plan.soldEventIds) writes.push((b) => b.update(doc(db, 'events', id), { status: 'draft', reviewNote: 'Organiser removed from Jazba Tickets.' }));
  }
  for (const id of plan.followIds) writes.push((b) => b.delete(doc(db, 'follows', id)));
  // The profile and the role change go last, so a half-finished clean-up can be re-run.
  writes.push((b) => b.delete(doc(db, 'organizers', org.id!)));
  if (isSelfRegistered(org) && org.userId && plan.accountRole === 'organizer') {
    writes.push((b) => b.update(doc(db, 'users', org.userId), { role: 'user' }));
  }
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    writes.slice(i, i + 400).forEach((w) => w(batch));
    await batch.commit();
  }
}

// ── Fees & payouts (admin writes, organiser reads their own) ──────────────

export interface Payout {
  id: string;
  organizerId: string;
  amount: number;
  currency: string;
  /** The same amount in USD at the site's fixed rates, for totals. */
  amountUsd: number;
  method: string;
  reference: string;
  note: string;
  /** yyyy-mm-dd */
  paidAt: string;
  createdAt: string;
  createdBy: string;
}

const PAYOUT_RATES: Record<string, number> = { USD: 1, GBP: 0.78, PKR: 280 };

export async function getPayouts(organizerId: string): Promise<Payout[]> {
  const snap = await getDocs(query(collection(db, 'payouts'), where('organizerId', '==', organizerId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Payout)
    .sort((a, b) => String(b.paidAt || b.createdAt).localeCompare(String(a.paidAt || a.createdAt)));
}

export async function recordPayout(input: {
  organizerId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  note: string;
  paidAt: string;
}): Promise<Payout> {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new Error('Enter the amount paid.');
  const currency = PAYOUT_RATES[input.currency] ? input.currency : 'PKR';
  const ref = doc(collection(db, 'payouts'));
  const payout: Payout = {
    id: ref.id,
    organizerId: input.organizerId,
    amount,
    currency,
    amountUsd: amount / PAYOUT_RATES[currency],
    method: input.method.trim().slice(0, 80),
    reference: input.reference.trim().slice(0, 120),
    note: input.note.trim().slice(0, 500),
    paidAt: /^\d{4}-\d{2}-\d{2}$/.test(input.paidAt) ? input.paidAt : new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    createdBy: auth.currentUser?.email || '',
  };
  await setDoc(ref, payout);
  return payout;
}

export async function deletePayout(id: string): Promise<void> {
  await deleteDoc(doc(db, 'payouts', id));
}

/** Jazba's share of an organiser's ticket sales, in percent (0–100). */
export async function setOrganizerFee(organizerId: string, feePercent: number): Promise<void> {
  const v = Math.min(100, Math.max(0, Math.round(Number(feePercent) * 100) / 100));
  await updateDoc(doc(db, 'organizers', organizerId), { feePercent: v });
}

/** Gross sales → Jazba fee → organiser's share → paid → still owed (all USD). */
export function earnings(grossUsd: number, feePercent: number | undefined, payouts: Pick<Payout, 'amountUsd'>[]) {
  const fee = (grossUsd * (Number(feePercent) || 0)) / 100;
  const net = grossUsd - fee;
  const paid = payouts.reduce((s, p) => s + (Number(p.amountUsd) || 0), 0);
  return { gross: grossUsd, fee, net, paid, owed: net - paid };
}
