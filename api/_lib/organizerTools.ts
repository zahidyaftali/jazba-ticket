// What an organiser can do from their portal that needs the server: door
// staff logins for their own events, tickets they issue themselves (guest
// list, complimentary), resending a buyer's ticket, cancelling a ticket they
// issued, and their events' waitlists. Every action checks the event belongs
// to the organiser. An admin can act for any organiser (organizerId).
import { HttpError, type Account } from './adminAuth.js';
import { createAuthUser, deleteAuthUser, setAuthPassword, type ServiceAccount } from './firebaseAuthUsers.js';
import {
  commitWrites, createDocuments, deleteDocument, getDocument, patchDocument, queryDocuments, type DocData,
} from './firestoreAdmin.js';
import { eventAvailability, eventTiers } from './availability.js';
import { newOrderId } from './orderId.js';
import { buildTicketEmail, parseTicket, ticketAttachments } from './ticketEmail.js';
import { EMAIL_RE, escapeHtml, sendEmail, type MailConfig } from './sendEmail.js';
import { ADMIN_INBOX, SITE, eventDateLine, layout, para } from './organizerEmails.js';

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const UID_RE = /^[A-Za-z0-9]{1,128}$/;
const DEFAULT_TIER_NAMES: Record<string, string> = { general: 'General admission', vip: 'VIP', elite: 'Elite' };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Whose portal this is: the organiser's own, or (for an admin) the one named. */
export function targetOrganizer(account: Account, body: any): string {
  if (account.isAdmin && typeof body.organizerId === 'string' && ID_RE.test(body.organizerId)) return body.organizerId;
  if (account.isOrganizer) return account.uid;
  throw new HttpError('Your organiser account hasn’t been approved yet.', 403);
}

async function ownEvent(sa: ServiceAccount, organizerId: string, eventId: unknown): Promise<DocData> {
  const id = typeof eventId === 'string' ? eventId : '';
  if (!ID_RE.test(id)) throw new HttpError('Choose one of your events.');
  const ev = await getDocument(sa, `events/${id}`);
  if (!ev || ev.organizerId !== organizerId) throw new HttpError('That isn’t one of your events.', 403);
  return { ...ev, id };
}

async function ownEvents(sa: ServiceAccount, organizerId: string, ids: unknown): Promise<string[]> {
  if (!Array.isArray(ids)) return [];
  const clean = [...new Set(ids.filter((x): x is string => typeof x === 'string' && ID_RE.test(x)))];
  if (clean.length > 50) throw new HttpError('Choose at most 50 events.');
  for (const id of clean) await ownEvent(sa, organizerId, id);
  return clean;
}

function tierName(ev: DocData, tier: string): string {
  const opt = Array.isArray(ev.ticketOptions) ? ev.ticketOptions.find((o: any) => o?.id === tier) : null;
  return String(opt?.name || DEFAULT_TIER_NAMES[tier] || tier);
}

function eventDetails(ev: DocData) {
  return {
    title: String(ev.title || 'Event'),
    date: String(ev.fullDate || [ev.date, ev.year].filter(Boolean).join(' ') || ''),
    time: String(ev.time || ev.startTime || ''),
    venue: String(ev.location || [ev.venue, ev.city].filter(Boolean).join(', ') || ''),
    image: String(ev.image || ev.bannerImage || ''),
    category: String(ev.category || ''),
  };
}

// ── Door staff ────────────────────────────────────────────────────────────

async function ownedStaff(sa: ServiceAccount, organizerId: string, uid: unknown): Promise<{ uid: string; profile: DocData; access: DocData }> {
  const id = typeof uid === 'string' ? uid : '';
  if (!UID_RE.test(id)) throw new HttpError('Unknown login.');
  const [profile, access] = await Promise.all([getDocument(sa, `users/${id}`), getDocument(sa, `doorStaff/${id}`)]);
  if (!profile || profile.role !== 'staff' || !access || access.ownerId !== organizerId) {
    throw new HttpError('That door staff login isn’t one of yours.', 403);
  }
  return { uid: id, profile, access };
}

function passwordFrom(v: unknown): string {
  const p = typeof v === 'string' ? v : '';
  if (p.length < 8) throw new HttpError('The password needs at least 8 characters.');
  if (p.length > 128) throw new HttpError('That password is too long.');
  return p;
}

export async function listStaff(sa: ServiceAccount, organizerId: string) {
  const access = await queryDocuments(sa, 'doorStaff', [{ field: 'ownerId', op: 'EQUAL', value: organizerId }]);
  const rows = await Promise.all(
    access.map(async (a) => {
      const p = await getDocument(sa, `users/${a.id}`).catch(() => null);
      if (!p || p.role !== 'staff') return null;
      return {
        uid: a.id,
        name: String(p.name || ''),
        email: String(p.email || ''),
        status: String(p.status || 'active'),
        events: Array.isArray(a.events) ? a.events : [],
        createdAt: String(p.createdAt || ''),
      };
    }),
  );
  return rows.filter(Boolean);
}

// ── Issuing tickets ───────────────────────────────────────────────────────

async function emailTicket(mail: MailConfig, booking: DocData, ev: DocData, to: string, message: string) {
  const d = eventDetails(ev);
  const t = parseTicket(
    {
      to,
      holderName: booking.billingName,
      eventTitle: d.title,
      category: d.category,
      date: d.date,
      time: d.time,
      venue: d.venue,
      tierName: booking.tierName,
      quantity: booking.quantity,
      orderId: booking.id,
      seat: booking.seat || '',
      code: booking.id,
      amount: booking.paymentMethod === 'complimentary' ? 'Complimentary' : '',
      message,
      image: d.image,
    },
    true,
  );
  const { subject, html } = buildTicketEmail(t);
  const { pdf, inline } = await ticketAttachments(t);
  await sendEmail(mail, { to: t.to, subject, html, attachments: [pdf, ...inline], replyTo: ADMIN_INBOX });
}

export async function issueTicket(sa: ServiceAccount, mail: MailConfig | null, organizerId: string, by: string, body: any) {
  const ev = await ownEvent(sa, organizerId, body.eventId);
  if (ev.status === 'cancelled') throw new HttpError('This event is cancelled.');
  const tier = str(body.tier, 64);
  if (!eventTiers(ev).some((t) => t.id === tier)) throw new HttpError('Choose one of the event’s ticket types.');
  const quantity = Math.floor(Number(body.quantity));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new HttpError('Issue between 1 and 50 tickets at a time.');
  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const phone = str(body.phone, 40);
  const note = str(body.note, 500);
  if (!name) throw new HttpError('Enter the guest’s name.');
  if (email && !EMAIL_RE.test(email)) throw new HttpError('That email address doesn’t look right.');
  if (body.send && !email) throw new HttpError('Add an email address to send the ticket.');

  const avail = await eventAvailability(sa, ev.id, ev);
  const left = avail ? (avail.tiers[tier]?.left ?? avail.left) : null;
  if (left !== null && quantity > left) {
    throw new HttpError(left <= 0 ? 'That ticket type is sold out.' : `Only ${left} left of that ticket type.`, 409);
  }

  const d = eventDetails(ev);
  const now = new Date();
  let orderId = newOrderId('JZ');
  for (let i = 0; i < 4 && (await getDocument(sa, `bookings/${orderId}`)); i++) orderId = newOrderId('JZ');
  const booking: DocData = {
    id: orderId,
    bookingNumber: orderId,
    orderId,
    eventId: ev.id,
    eventTitle: d.title,
    eventDate: d.date,
    eventTime: d.time,
    eventVenue: d.venue,
    eventImage: d.image,
    userId: '',
    ticketType: tier,
    tier,
    tierName: tierName(ev, tier),
    quantity,
    amount: 0,
    pricePaid: 0,
    currency: 'USD',
    amountLocal: 0,
    paymentStatus: 'paid',
    bookingStatus: 'active',
    paymentMethod: 'complimentary',
    qrCode: orderId,
    barCode: orderId,
    seat: '',
    createdAt: now.toISOString(),
    bookingDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    billingName: name,
    billingEmail: email,
    billingPhone: phone,
    promoApplied: false,
    source: 'organizer',
    issuedBy: by,
    note,
  };
  const passes = Array.from({ length: quantity }, (_, i) => {
    const ticketNumber = `${orderId}-T${i + 1}`;
    return { path: `tickets/${ticketNumber}`, data: { id: ticketNumber, ticketNumber, bookingId: orderId, userId: '', eventId: ev.id, qrCode: ticketNumber, status: 'active' } };
  });
  const result = await createDocuments(sa, [{ path: `bookings/${orderId}`, data: booking }, ...passes]);
  if (result === 'exists') throw new HttpError('Please try again.', 409);

  let emailed = false;
  if (body.send && email && mail) {
    try {
      await emailTicket(mail, booking, ev, email, `${name}, here is your ticket for ${d.title}. Show the QR code at the door — on your phone or printed.`);
      emailed = true;
      await patchDocument(sa, `bookings/${orderId}`, { emailedAt: new Date().toISOString(), emailedTo: email }).catch(() => undefined);
    } catch (err: any) {
      console.error(`Organiser ticket ${orderId}: email failed:`, err?.message || err);
    }
  }
  return { orderId, emailed };
}

async function ownOrder(sa: ServiceAccount, organizerId: string, orderId: unknown): Promise<{ booking: DocData; ev: DocData }> {
  const id = typeof orderId === 'string' ? orderId : '';
  if (!ID_RE.test(id)) throw new HttpError('Unknown order.');
  const booking = await getDocument(sa, `bookings/${id}`);
  if (!booking) throw new HttpError('Order not found.', 404);
  const ev = await ownEvent(sa, organizerId, booking.eventId);
  return { booking: { ...booking, id }, ev };
}

export async function resendTicket(sa: ServiceAccount, mail: MailConfig | null, organizerId: string, body: any) {
  if (!mail) throw new HttpError('Email isn’t set up on the server yet.', 503);
  const { booking, ev } = await ownOrder(sa, organizerId, body.orderId);
  if (booking.bookingStatus === 'cancelled') throw new HttpError('This order is cancelled.');
  const to = str(body.to, 200).toLowerCase() || String(booking.billingEmail || '').toLowerCase();
  if (!EMAIL_RE.test(to)) throw new HttpError('Add an email address to send the ticket to.');
  await emailTicket(mail, booking, ev, to, `Here is your ticket for ${eventDetails(ev).title} again. Show the QR code at the door — on your phone or printed.`);
  await patchDocument(sa, `bookings/${booking.id}`, { emailedAt: new Date().toISOString(), emailedTo: to }).catch(() => undefined);
  return { sentTo: to };
}

/** Cancel a ticket the organiser issued themselves (never a paid order —
 *  refunds go through the Jazba team). */
export async function cancelIssuedTicket(sa: ServiceAccount, organizerId: string, body: any) {
  const { booking } = await ownOrder(sa, organizerId, body.orderId);
  if (booking.source !== 'organizer' || booking.paymentMethod !== 'complimentary') {
    throw new HttpError('Only tickets you issued yourself can be cancelled here. For paid orders, email info@jazbatickets.com.', 403);
  }
  const passes = await queryDocuments(sa, 'tickets', [{ field: 'bookingId', op: 'EQUAL', value: booking.id }]);
  if (passes.some((p) => p.status === 'scanned' || (Number(p.peopleIn) || 0) > 0)) throw new HttpError('Someone has already been checked in on this ticket.', 409);
  await patchDocument(sa, `bookings/${booking.id}`, { bookingStatus: 'cancelled', cancelledAt: new Date().toISOString() });
  await Promise.all(passes.map((p) => patchDocument(sa, `tickets/${p.id}`, { status: 'cancelled' }).catch(() => undefined)));
  return { cancelled: true };
}

// ── Waitlist ──────────────────────────────────────────────────────────────

export async function notifyWaitlist(sa: ServiceAccount, mail: MailConfig | null, organizerId: string, body: any) {
  if (!mail) throw new HttpError('Email isn’t set up on the server yet.', 503);
  const ev = await ownEvent(sa, organizerId, body.eventId);
  const note = str(body.message, 800);
  const entries = (await queryDocuments(sa, 'waitlist', [{ field: 'eventId', op: 'EQUAL', value: ev.id }])).filter(
    (w) => w.status !== 'notified' && EMAIL_RE.test(String(w.email || '')),
  );
  if (!entries.length) return { notified: 0 };
  const d = eventDetails(ev);
  const link = `${SITE}/events/${encodeURIComponent(ev.id)}`;
  const html = layout(
    `Tickets are available — ${d.title}`,
    para(`Good news: you asked us to tell you when tickets for ${d.title} became available, and they just have.`) +
      (note ? para(note) : '') +
      para([d.date, d.time, d.venue].filter(Boolean).join(' · ')) +
      para('Tickets are first come, first served, so book soon if you’d like to go.'),
    { label: 'Get tickets', href: link },
    'You’re receiving this because you joined the waitlist for this event on Jazba Tickets. It’s a one-off email.',
  );
  // Everyone is blind-copied, so nobody sees anyone else's address.
  const emails = entries.map((w) => String(w.email).toLowerCase());
  for (let i = 0; i < emails.length; i += 45) {
    await sendEmail(mail, { to: ADMIN_INBOX, bcc: emails.slice(i, i + 45).join(', '), subject: `Tickets available — ${d.title}`, html, replyTo: ADMIN_INBOX });
  }
  const at = new Date().toISOString();
  await commitWrites(
    sa,
    entries.map((w) => ({ set: { path: `waitlist/${w.id}`, data: { ...withoutId(w), status: 'notified', notifiedAt: at } } })),
  );
  return { notified: entries.length };
}

function withoutId(d: DocData): Record<string, unknown> {
  const { id: _id, ...rest } = d;
  return rest;
}

export async function removeWaitlistEntry(sa: ServiceAccount, organizerId: string, body: any) {
  const id = typeof body.id === 'string' ? body.id : '';
  if (!ID_RE.test(id)) throw new HttpError('Unknown entry.');
  const entry = await getDocument(sa, `waitlist/${id}`);
  if (!entry) return { removed: true };
  await ownEvent(sa, organizerId, entry.eventId);
  await deleteDocument(sa, `waitlist/${id}`);
  return { removed: true };
}

// ── The route ─────────────────────────────────────────────────────────────

export async function runOrganizerTool(sa: ServiceAccount, mail: MailConfig | null, account: Account, body: any): Promise<unknown> {
  const organizerId = targetOrganizer(account, body);
  const by = account.email || account.uid;
  switch (body.action) {
    case 'staff-list':
      return { staff: await listStaff(sa, organizerId) };

    case 'staff-create': {
      const name = str(body.name, 80);
      const email = str(body.email, 128).toLowerCase();
      if (!name) throw new HttpError('Enter the staff member’s name.');
      if (!EMAIL_RE.test(email)) throw new HttpError('Enter a valid email address.');
      const events = await ownEvents(sa, organizerId, body.events);
      const uid = await createAuthUser(sa, email, passwordFrom(body.password), name);
      const now = new Date().toISOString();
      try {
        await createDocuments(sa, [
          { path: `users/${uid}`, data: { uid, email, name, role: 'staff', status: 'active', createdAt: now } },
          { path: `doorStaff/${uid}`, data: { uid, events, ownerId: organizerId, updatedAt: now, updatedBy: by } },
        ]);
      } catch (err) {
        await deleteAuthUser(sa, uid).catch(() => undefined);
        throw new HttpError('Could not save the new login. Try again.', 502);
      }
      return { uid, name, email, events, status: 'active' };
    }

    case 'staff-events': {
      const { uid } = await ownedStaff(sa, organizerId, body.uid);
      const events = await ownEvents(sa, organizerId, body.events);
      await patchDocument(sa, `doorStaff/${uid}`, { events, updatedAt: new Date().toISOString(), updatedBy: by });
      return { uid, events };
    }

    case 'staff-password': {
      const { uid } = await ownedStaff(sa, organizerId, body.uid);
      await setAuthPassword(sa, uid, passwordFrom(body.password));
      return { uid };
    }

    case 'staff-status': {
      const { uid } = await ownedStaff(sa, organizerId, body.uid);
      const status = body.status === 'suspended' ? 'suspended' : 'active';
      await patchDocument(sa, `users/${uid}`, { status, updatedAt: new Date().toISOString() });
      return { uid, status };
    }

    case 'staff-delete': {
      const { uid } = await ownedStaff(sa, organizerId, body.uid);
      await deleteAuthUser(sa, uid);
      await deleteDocument(sa, `users/${uid}`);
      await deleteDocument(sa, `doorStaff/${uid}`);
      return { uid, deleted: true };
    }

    case 'scanner-access': {
      // An organiser opening Jazba Scan: their own events become the ones
      // they may check tickets for (same rules as door staff).
      if (!account.isOrganizer || organizerId !== account.uid) throw new HttpError('Only the organiser can open their own scanner.', 403);
      const events = (await queryDocuments(sa, 'events', [{ field: 'organizerId', op: 'EQUAL', value: organizerId }]))
        .filter((e) => e.status === 'published' || e.status === 'completed')
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .slice(0, 50)
        .map((e) => e.id);
      await patchDocument(sa, `doorStaff/${organizerId}`, { uid: organizerId, events, ownerId: organizerId, updatedAt: new Date().toISOString(), updatedBy: by });
      return { events };
    }

    case 'issue-ticket':
      return issueTicket(sa, mail, organizerId, by, body);
    case 'resend-ticket':
      return resendTicket(sa, mail, organizerId, body);
    case 'cancel-ticket':
      return cancelIssuedTicket(sa, organizerId, body);
    case 'waitlist-notify':
      return notifyWaitlist(sa, mail, organizerId, body);
    case 'waitlist-remove':
      return removeWaitlistEntry(sa, organizerId, body);
  }
  throw new HttpError('Unknown action.');
}

export { escapeHtml, eventDateLine };
