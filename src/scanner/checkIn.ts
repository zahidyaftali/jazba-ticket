// Door scanner data: find the order behind a scanned code, and check its
// admission passes in. A check-in runs as a Firestore transaction, so a pass
// can only ever be checked in once — even when two phones scan the same
// ticket at the same moment.

import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Booking, TicketPass } from '../services/backendService';

/** Firestore rules only allow reads of ids like these. */
const VALID_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** The code inside a scan, tidied: a bare order number, or the last part of a link. */
export function cleanCode(raw: string): string {
  let s = String(raw || '').trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      s = u.searchParams.get('code') || u.searchParams.get('order') || u.pathname.split('/').filter(Boolean).pop() || s;
    } catch {
      // not a link after all
    }
  }
  return s.replace(/^#/, '').trim();
}

export interface OrderLookup {
  booking: Booking | null;
  passes: TicketPass[];
  /** Set when the code was one pass's own code rather than the order's. */
  passId?: string;
}

const byTicketNumber = (a: TicketPass, b: TicketPass) =>
  (a.ticketNumber || '').localeCompare(b.ticketNumber || '', undefined, { numeric: true });

async function bookingById(id: string): Promise<Booking | null> {
  if (!VALID_ID.test(id)) return null;
  const snap = await getDoc(doc(db, 'bookings', id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Booking) : null;
}

async function firstWhere<T>(coll: 'bookings' | 'tickets', field: string, value: string): Promise<T | null> {
  const snap = await getDocs(query(collection(db, coll), where(field, '==', value), limit(1)));
  const d = snap.docs[0];
  return d ? ({ ...d.data(), id: d.id } as T) : null;
}

async function passesFor(bookingId: string): Promise<TicketPass[]> {
  const snap = await getDocs(query(collection(db, 'tickets'), where('bookingId', '==', bookingId)));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as TicketPass).sort(byTicketNumber);
}

/** The order (and its passes) a scanned or typed code belongs to, or null. */
export async function lookupCode(raw: string): Promise<OrderLookup | null> {
  const code = cleanCode(raw);
  if (!code || code.length > 200) return null;
  const variants = [...new Set([code, code.toUpperCase()])];

  // The QR on every ticket is the order number, which is also the booking's id.
  for (const v of variants) {
    const booking = await bookingById(v);
    if (booking) return { booking, passes: await passesFor(booking.id!) };
  }

  // Older orders, and codes typed from elsewhere on the ticket.
  const [bookingHits, passHits] = await Promise.all([
    Promise.all(variants.flatMap((v) => ['orderId', 'bookingNumber', 'barCode', 'qrCode'].map((f) => firstWhere<Booking>('bookings', f, v)))),
    Promise.all(variants.flatMap((v) => ['ticketNumber', 'qrCode'].map((f) => firstWhere<TicketPass>('tickets', f, v)))),
  ]);
  const booking = bookingHits.find(Boolean);
  if (booking) return { booking, passes: await passesFor(booking.id!) };

  // One admission pass's own code: just that pass.
  const pass = passHits.find(Boolean);
  if (pass) return { booking: await bookingById(pass.bookingId), passes: [pass], passId: pass.id };

  return null;
}

/** A check-in that can't go ahead: the pass was used or cancelled since it
 *  was looked up (e.g. on another phone a moment ago). */
export class CheckInConflict extends Error {}

/** Check these passes in, all or nothing. Returns the check-in time. */
export async function checkInPasses(passIds: string[], by: string): Promise<string> {
  const at = new Date().toISOString();
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(passIds.map((id) => tx.get(doc(db, 'tickets', id))));
    for (const s of snaps) {
      if (!s.exists()) throw new CheckInConflict('This ticket no longer exists.');
      const status = s.data().status;
      if (status === 'scanned') throw new CheckInConflict('Already checked in, a moment ago on another device.');
      if (status !== 'active') throw new CheckInConflict('This ticket has been cancelled.');
    }
    for (const s of snaps) tx.update(s.ref, { status: 'scanned', scannedAt: at, scannedBy: by });
  });
  return at;
}

/** An order saved without its admission passes: create them now, with the
 *  first `admit` of them checked in. Fixed ids make a second scan see them. */
export async function checkInWithoutPasses(booking: Booking, admit: number, by: string): Promise<string> {
  const at = new Date().toISOString();
  const id = booking.id || '';
  const count = Math.max(1, Number(booking.quantity) || 1);
  await runTransaction(db, async (tx) => {
    const refs = Array.from({ length: count }, (_, i) => doc(db, 'tickets', `${id}-T${i + 1}`));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    if (snaps.some((s) => s.exists())) throw new CheckInConflict('Already checked in, a moment ago on another device.');
    refs.forEach((ref, i) => {
      const inNow = i < admit;
      tx.set(ref, {
        id: ref.id,
        ticketNumber: `${booking.bookingNumber || id}-T${i + 1}`,
        bookingId: id,
        userId: booking.userId || '',
        eventId: booking.eventId || '',
        qrCode: booking.orderId || id,
        status: inNow ? 'scanned' : 'active',
        ...(inNow ? { scannedAt: at, scannedBy: by } : {}),
      });
    });
  });
  return at;
}

export interface EventCheckIns {
  /** Passes for the event, cancelled ones left out. */
  total: number;
  inside: number;
}

/** Live check-in count for one event, across every scanner. */
export function watchEventCheckIns(eventId: string, onChange: (c: EventCheckIns) => void, onError: () => void): () => void {
  return onSnapshot(
    query(collection(db, 'tickets'), where('eventId', '==', eventId)),
    (snap) => {
      let total = 0;
      let inside = 0;
      snap.forEach((d) => {
        const status = d.data().status;
        if (status === 'cancelled') return;
        total++;
        if (status === 'scanned') inside++;
      });
      onChange({ total, inside });
    },
    onError,
  );
}
