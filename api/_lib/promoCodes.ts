// Discount codes organisers (and admins) create in their portal, stored in
// promoCodes/<CODE>. The payment server checks them here, so a code can't
// be stretched: it only works on its organiser's own events (an admin's code,
// organizerId 'admin', works on any event), inside its dates, until its use
// limit, and only for the ticket types it names. Codes written into the
// code itself (PROMO_CODES in stripePayment.ts) are checked first.
import type { ServiceAccount } from './firebaseAuthUsers.js';
import { getDocument, incrementField, type DocData } from './firestoreAdmin.js';

export const PROMO_CODE_RE = /^[A-Z0-9]{3,24}$/;

export interface DbPromo {
  code: string;
  rate: number;
  /** Ticket types it covers; empty = all. */
  tiers: string[];
  label: string;
}

export type PromoCheck = { ok: true; promo: DbPromo } | { ok: false; reason: string };

/** Is a stored code usable on this event right now? */
export function checkStoredPromo(doc: DocData | null, eventId: string, eventOrganizerId: string, now = Date.now()): PromoCheck {
  if (!doc) return { ok: false, reason: 'That code isn’t valid.' };
  if (doc.active === false) return { ok: false, reason: 'That code isn’t active.' };
  const owner = String(doc.organizerId || '');
  if (owner !== 'admin' && (!eventOrganizerId || owner !== eventOrganizerId)) return { ok: false, reason: 'That code isn’t valid for this event.' };
  const events: string[] = Array.isArray(doc.eventIds) ? doc.eventIds : [];
  if (events.length && !events.includes(eventId)) return { ok: false, reason: 'That code isn’t valid for this event.' };
  const starts = Date.parse(String(doc.startsAt || ''));
  if (Number.isFinite(starts) && now < starts) return { ok: false, reason: 'That code can’t be used yet.' };
  const ends = Date.parse(String(doc.endsAt || ''));
  if (Number.isFinite(ends) && now >= ends) return { ok: false, reason: 'That code has expired.' };
  const max = Math.max(0, Math.floor(Number(doc.maxUses) || 0));
  if (max > 0 && (Number(doc.uses) || 0) >= max) return { ok: false, reason: 'That code has been used up.' };
  const pct = Math.floor(Number(doc.percentOff) || 0);
  if (pct < 1 || pct > 100) return { ok: false, reason: 'That code isn’t valid.' };
  return {
    ok: true,
    promo: {
      code: String(doc.code || doc.id || ''),
      rate: pct / 100,
      tiers: Array.isArray(doc.tiers) ? doc.tiers.filter((t: unknown) => typeof t === 'string') : [],
      label: String(doc.label || ''),
    },
  };
}

export async function lookupStoredPromo(
  sa: ServiceAccount | null,
  code: string,
  eventId: string,
  eventOrganizerId: string,
): Promise<PromoCheck> {
  const clean = code.trim().toUpperCase();
  if (!PROMO_CODE_RE.test(clean)) return { ok: false, reason: 'That code isn’t valid.' };
  const doc = await getDocument(sa, `promoCodes/${clean}`);
  return checkStoredPromo(doc, eventId, eventOrganizerId);
}

/** Count one more use of a stored code (after a paid order). Codes that
 *  aren't stored are left alone. */
export async function countPromoUse(sa: ServiceAccount | null, code: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  if (!PROMO_CODE_RE.test(clean)) return;
  await incrementField(sa, `promoCodes/${clean}`, 'uses', 1).catch(() => false);
}

// One person can't try thousands of codes: a few dozen checks per address
// every ten minutes, per server instance.
const attempts = new Map<string, { n: number; since: number }>();
export function tooManyPromoChecks(key: string, limit = 40, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.since > windowMs) {
    attempts.set(key, { n: 1, since: now });
    return false;
  }
  a.n += 1;
  return a.n > limit;
}
