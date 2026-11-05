// Door scanner data: find the order behind a scanned code, and check people
// in on its admission passes. A group pass (e.g. "Group of 4") lets its
// people in together or one by one until all have come. A check-in runs as
// a Firestore transaction, so no pass ever lets in more people than it
// admits — even when two phones scan the same ticket at the same moment.

import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Booking, TicketPass } from '../services/backendService';
import { passPeople, peoplePerPass, type EventItem } from '../types';

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

/** A check-in that can't go ahead: the ticket was used or cancelled since it
 *  was looked up (e.g. on another phone a moment ago). */
export class CheckInConflict extends Error {}

const plural = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

/** Let `people` in on an order's passes (or the one pass scanned), filling
 *  each pass before the next. `perPass` is peoplePerPass() for the order.
 *  All or nothing; returns the check-in time. */
export async function checkInPeople(passIds: string[], perPass: number, people: number, by: string): Promise<string> {
  const at = new Date().toISOString();
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(passIds.map((id) => tx.get(doc(db, 'tickets', id))));
    if (snaps.some((s) => !s.exists())) throw new CheckInConflict('This ticket no longer exists.');
    const slots = snaps.map((s) => {
      const data = s.data() as TicketPass;
      return { ref: s.ref, data, ...passPeople(data, perPass) };
    });
    const left = slots.reduce((n, x) => n + x.left, 0);
    if (left < people) {
      if (slots.every((x) => x.data.status === 'cancelled')) throw new CheckInConflict('This ticket has been cancelled.');
      throw new CheckInConflict(
        left === 0
          ? 'Already checked in, a moment ago on another device.'
          : `Only ${plural(left)} left on this ticket now: someone was checked in on another device a moment ago.`,
      );
    }
    let toAdmit = people;
    for (const x of slots) {
      if (toAdmit === 0) break;
      if (x.left === 0) continue;
      const take = Math.min(x.left, toAdmit);
      toAdmit -= take;
      const inside = x.inside + take;
      tx.update(x.ref, {
        people: x.total,
        peopleIn: inside,
        status: inside >= x.total ? 'scanned' : 'active',
        scannedAt: at,
        scannedBy: by,
        checkIns: [...(Array.isArray(x.data.checkIns) ? x.data.checkIns : []), { at, by, people: take }],
      });
    }
  });
  return at;
}

/** An order saved without its admission passes: create them now, with the
 *  first `people` let in. Fixed ids make a second scan see them. */
export async function checkInWithoutPasses(booking: Booking, perPass: number, people: number, by: string): Promise<string> {
  const at = new Date().toISOString();
  const id = booking.id || '';
  const count = Math.max(1, Number(booking.quantity) || 1);
  await runTransaction(db, async (tx) => {
    const refs = Array.from({ length: count }, (_, i) => doc(db, 'tickets', `${id}-T${i + 1}`));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    if (snaps.some((s) => s.exists())) throw new CheckInConflict('Already checked in, a moment ago on another device.');
    let toAdmit = people;
    refs.forEach((ref, i) => {
      const take = Math.min(perPass, toAdmit);
      toAdmit -= take;
      tx.set(ref, {
        id: ref.id,
        ticketNumber: `${booking.bookingNumber || id}-T${i + 1}`,
        bookingId: id,
        userId: booking.userId || '',
        eventId: booking.eventId || '',
        qrCode: booking.orderId || id,
        people: perPass,
        peopleIn: take,
        status: take >= perPass ? 'scanned' : 'active',
        ...(take > 0 ? { scannedAt: at, scannedBy: by, checkIns: [{ at, by, people: take }] } : {}),
      });
    });
  });
  return at;
}

export interface EventCheckIns {
  /** People the event's passes admit, cancelled ones left out. */
  total: number;
  inside: number;
}

/** Live count of people checked in for one event, across every scanner.
 *  The orders say how many people each pass admits (group packages). */
export function watchEventCheckIns(
  eventId: string,
  event: EventItem | null,
  onChange: (c: EventCheckIns) => void,
  onError: () => void,
): () => void {
  let passes: TicketPass[] | null = null;
  let orders: Map<string, Booking> | null = null;
  const emit = () => {
    if (!passes || !orders) return;
    let total = 0;
    let inside = 0;
    for (const p of passes) {
      if (p.status === 'cancelled') continue;
      const c = passPeople(p, peoplePerPass(orders.get(p.bookingId), event));
      total += c.total;
      inside += c.inside;
    }
    onChange({ total, inside });
  };
  const offPasses = onSnapshot(
    query(collection(db, 'tickets'), where('eventId', '==', eventId)),
    (snap) => {
      passes = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as TicketPass);
      emit();
    },
    onError,
  );
  const offOrders = onSnapshot(
    query(collection(db, 'bookings'), where('eventId', '==', eventId)),
    (snap) => {
      orders = new Map(snap.docs.map((d) => [d.id, { ...d.data(), id: d.id } as Booking]));
      emit();
    },
    () => {
      // Without the orders, count one person per pass rather than nothing.
      orders = orders || new Map();
      emit();
    },
  );
  return () => {
    offPasses();
    offOrders();
  };
}
