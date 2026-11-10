// Emails around organiser sign-ups and event reviews. Every email is built
// from what's in the database (read with the service account), never from
// what the browser sends, so nobody can use this to send arbitrary mail.
import { HttpError, type Account } from './adminAuth.js';
import type { ServiceAccount } from './firebaseAuthUsers.js';
import { getDocument, type DocData } from './firestoreAdmin.js';
import { escapeHtml, isValidEmail, sendEmail, type MailConfig } from './sendEmail.js';
import { announceToFollowers } from './saleNotices.js';

export const ADMIN_INBOX = 'info@jazbatickets.com';
// Links in emails always point at the live site, whatever host the request used.
export const SITE = 'https://jazbatickets.com';

// One email per person/action every few minutes, per server instance.
const recent = new Map<string, number>();
function throttled(key: string, ms = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < ms) return true;
  recent.set(key, now);
  return false;
}

export function row(label: string, value: unknown): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#111">${escapeHtml(v).replace(/\n/g, '<br/>')}</td></tr>`;
}

export function layout(title: string, body: string, cta?: { label: string; href: string }, footer = ''): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#000;color:#ffed00;font-weight:bold;font-size:13px;letter-spacing:2px;padding:12px 16px">JAZBA TICKETS</div>
      <div style="padding:20px 16px;border:1px solid #eee;border-top:0">
        <h2 style="font-size:18px;margin:0 0 14px">${escapeHtml(title)}</h2>
        ${body}
        ${cta ? `<p style="margin:22px 0 4px"><a href="${cta.href}" style="background:#ffed00;color:#000;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 18px;display:inline-block">${escapeHtml(cta.label)}</a></p>` : ''}
      </div>
      <p style="margin-top:14px;font-size:11px;color:#999">${footer ? `${footer}<br/>` : ''}Jazba Tickets · jazbatickets.com</p>
    </div>`;
}

export const para = (text: string) => `<p style="font-size:14px;line-height:1.55;margin:0 0 12px">${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;

/** Where to email an organiser: their contact address and their account's. */
export async function organizerRecipients(sa: ServiceAccount | null, org: DocData): Promise<string> {
  const account = org.userId ? await getDocument(sa, `users/${org.userId}`).catch(() => null) : null;
  const list = [org.email, account?.email].map((e) => String(e || '').trim().toLowerCase()).filter((e) => e && isValidEmail(e));
  return [...new Set(list)].join(', ');
}

export function eventDateLine(ev: DocData): string {
  return [ev.fullDate || [ev.date, ev.year].filter(Boolean).join(' '), ev.startTime, [ev.venue, ev.city].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');
}

/** "Early bird $10.00 × 50, Standard $15.00" — or the older General/VIP/Elite prices. */
function ticketTypesLine(ev: DocData): string {
  const options: any[] = Array.isArray(ev.ticketOptions) ? ev.ticketOptions : [];
  if (!options.length) {
    return [ev.tierPrices?.general || ev.price, ev.tierPrices?.vip, ev.tierPrices?.elite].filter(Boolean).join(' / ');
  }
  return options
    .map((o) => {
      const parts = [`${o.name} $${Number(o.price || 0).toFixed(2)}`];
      if (o.capacity) parts.push(`× ${o.capacity}`);
      if (o.salesEnd) parts.push(`(sales end ${String(o.salesEnd).slice(0, 16).replace('T', ' ')} UTC)`);
      return parts.join(' ');
    })
    .join('\n');
}

export type NotifyAction = 'applied' | 'event-submitted' | 'decision' | 'event-decision';

export async function sendOrganizerNotice(
  mail: MailConfig,
  sa: ServiceAccount | null,
  account: Account,
  body: { action?: unknown; eventId?: unknown; organizerId?: unknown; note?: unknown },
): Promise<void> {
  const action = String(body.action || '') as NotifyAction;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  const idParam = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v) ? v : '');

  if (action === 'applied') {
    const org = await getDocument(sa, `organizers/${account.uid}`);
    if (!org || org.userId !== account.uid || org.status !== 'pending') throw new HttpError('No pending application found.', 404);
    if (throttled(`applied:${account.uid}`)) return;
    // The applicant's note is kept privately (organizerPrivate); older profiles had it on the profile.
    const priv = await getDocument(sa, `organizerPrivate/${account.uid}`).catch(() => null);
    const details = [
      row('Organiser', org.companyName),
      row('Contact name', org.contactName),
      row('Contact email', org.email),
      row('Account email', account.email),
      row('Phone', org.phone),
      row('Website', org.website),
      row('Location', org.location),
      row('Event types', (org.specialties || []).join(', ')),
      row('About', org.description),
      row('Notes', priv?.applicationNote || org.applicationNote),
    ].join('');
    await sendEmail(mail, {
      to: ADMIN_INBOX,
      subject: `New organiser application — ${org.companyName}`,
      html: layout('New organiser application', `<table style="border-collapse:collapse;width:100%">${details}</table>`, {
        label: 'Review application',
        href: `${SITE}/admin/organizers/view/${encodeURIComponent(account.uid)}`,
      }),
      replyTo: isValidEmail(String(org.email || '')) ? String(org.email) : undefined,
    });
    const to = await organizerRecipients(sa, org);
    if (to) {
      await sendEmail(mail, {
        to,
        subject: 'We’ve received your organiser application',
        html: layout(
          `Thanks, ${org.contactName || org.companyName}`,
          para(`We’ve received your application to sell tickets on Jazba Tickets as ${org.companyName}.`) +
            para('Our team reviews every organiser before their events go on sale. We’ll email you as soon as your account is approved — usually within one or two working days.'),
          { label: 'Open your organiser portal', href: `${SITE}/organizer` },
        ),
        replyTo: ADMIN_INBOX,
      });
    }
    return;
  }

  if (action === 'event-submitted') {
    const eventId = idParam(body.eventId);
    const ev = eventId ? await getDocument(sa, `events/${eventId}`) : null;
    if (!account.isOrganizer || !ev || ev.organizerId !== account.uid || ev.status !== 'pending') throw new HttpError('No event awaiting review found.', 404);
    if (throttled(`event:${eventId}`)) return;
    const org = await getDocument(sa, `organizers/${account.uid}`).catch(() => null);
    const details = [
      row('Event', ev.title),
      row('Organiser', org?.companyName || account.email),
      row('When & where', eventDateLine(ev)),
      row('Ticket types (USD)', ticketTypesLine(ev)),
      row('Capacity', ev.capacity),
    ].join('');
    await sendEmail(mail, {
      to: ADMIN_INBOX,
      subject: `Event submitted for review — ${ev.title}`,
      html: layout('An organiser submitted an event', `<table style="border-collapse:collapse;width:100%">${details}</table>`, {
        label: 'Review event',
        href: `${SITE}/admin/events/edit/${encodeURIComponent(eventId)}`,
      }),
    });
    return;
  }

  if (!account.isAdmin) throw new HttpError('Only admins can do that.', 403);

  if (action === 'decision') {
    const organizerId = idParam(body.organizerId);
    const org = organizerId ? await getDocument(sa, `organizers/${organizerId}`) : null;
    if (!org) throw new HttpError('Organiser not found.', 404);
    const to = await organizerRecipients(sa, org);
    if (!to) return;
    const name = String(org.contactName || org.companyName || 'there');
    if (org.status === 'approved') {
      await sendEmail(mail, {
        to,
        subject: 'You’re approved to sell tickets on Jazba Tickets',
        html: layout(
          `Welcome aboard, ${name}`,
          para(`${org.companyName} is now an approved organiser on Jazba Tickets. You can create your events, and our team will review each one before it goes on sale.`) +
            (note ? para(note) : ''),
          { label: 'Go to your organiser portal', href: `${SITE}/organizer` },
        ),
        replyTo: ADMIN_INBOX,
      });
    } else if (org.status === 'rejected') {
      await sendEmail(mail, {
        to,
        subject: 'About your organiser application',
        html: layout(
          `Hi ${name}`,
          para(`Thanks for applying to sell tickets on Jazba Tickets as ${org.companyName}. We can’t approve the application yet.`) +
            (note ? para(`What we need: ${note}`) : '') +
            para('You can update your details and send the application again from the organiser portal.'),
          { label: 'Update your application', href: `${SITE}/organizer` },
        ),
        replyTo: ADMIN_INBOX,
      });
    } else if (org.status === 'suspended') {
      await sendEmail(mail, {
        to,
        subject: 'Your organiser account has been paused',
        html: layout(
          `Hi ${name}`,
          para(`Your organiser account for ${org.companyName} has been paused, so you can’t create or change events for now.`) +
            (note ? para(note) : '') +
            para('Reply to this email if you have any questions.'),
        ),
        replyTo: ADMIN_INBOX,
      });
    }
    return;
  }

  if (action === 'event-decision') {
    const eventId = idParam(body.eventId);
    const ev = eventId ? await getDocument(sa, `events/${eventId}`) : null;
    if (!ev || !ev.organizerId) throw new HttpError('Event not found.', 404);
    const org = await getDocument(sa, `organizers/${ev.organizerId}`).catch(() => null);
    if (!org) return; // an admin's own event — nobody to tell
    const to = await organizerRecipients(sa, org);
    if (!to) return;
    if (ev.status === 'published') {
      await sendEmail(mail, {
        to,
        subject: `Your event is live — ${ev.title}`,
        html: layout(
          'Your event is on sale',
          para(`${ev.title} has been approved and is now live on Jazba Tickets.`) + (note ? para(note) : '') + para(eventDateLine(ev)),
          { label: 'See your event page', href: `${SITE}/events/${encodeURIComponent(eventId)}` },
        ),
        replyTo: ADMIN_INBOX,
      });
      // Followers hear about it once, after the organiser's own email.
      await announceToFollowers(sa, mail, eventId, ev, org).catch((err) => console.error('Follower announcement failed:', err?.message || err));
    } else {
      await sendEmail(mail, {
        to,
        subject: `Changes needed — ${ev.title}`,
        html: layout(
          'Your event needs a few changes',
          para(`We’ve reviewed ${ev.title} and it isn’t on sale yet.`) + (note ? para(`What to change: ${note}`) : '') + para('Edit the event in your organiser portal and submit it again.'),
          { label: 'Open your event', href: `${SITE}/organizer/events/edit/${encodeURIComponent(eventId)}` },
        ),
        replyTo: ADMIN_INBOX,
      });
    }
    return;
  }

  throw new HttpError('Unknown action.');
}
