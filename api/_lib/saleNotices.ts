// What happens after a new paid order and when an organiser's event goes
// live: the organiser gets an email for each sale (unless they turned it
// off), a stored discount code counts one more use, and an event's
// organiser followers hear about it once, by email and in their account.
import type Stripe from 'stripe';
import type { ServiceAccount } from './firebaseAuthUsers.js';
import { commitWrites, getDocument, patchDocument, queryDocuments, type DocData } from './firestoreAdmin.js';
import { countPromoUse } from './promoCodes.js';
import { buildAvailability } from './availability.js';
import { EMAIL_RE, sendEmail, type MailConfig } from './sendEmail.js';
import { ADMIN_INBOX, SITE, eventDateLine, layout, organizerRecipients, para, row } from './organizerEmails.js';
import type { VerifiedCheckoutSession } from './stripePayment.js';

function paid(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor == null || !currency) return '';
  const cur = currency.toUpperCase();
  const v = amountMinor / 100;
  if (cur === 'PKR') return `PKR ${Math.round(v).toLocaleString('en-GB')}`;
  const n = v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur === 'GBP' ? `£${n}` : cur === 'USD' ? `$${n}` : `${n} ${cur}`;
}

/** Runs once per new card order (after the booking is saved). Never throws. */
export async function afterNewCardOrder(
  sa: ServiceAccount | null,
  mail: MailConfig | null,
  session: Stripe.Checkout.Session,
  order: VerifiedCheckoutSession,
): Promise<void> {
  const m = session.metadata || {};
  if (m.promo) await countPromoUse(sa, m.promo).catch(() => undefined);
  if (!mail || !order.eventId || order.eventId.startsWith('wp-')) return;
  try {
    const ev = await getDocument(sa, `events/${order.eventId}`);
    if (!ev?.organizerId) return;
    const [org, settings] = await Promise.all([
      getDocument(sa, `organizers/${ev.organizerId}`).catch(() => null),
      getDocument(sa, `organizerPrivate/${ev.organizerId}`).catch(() => null),
    ]);
    if (!org || settings?.notifyOnSale === false) return;
    const to = await organizerRecipients(sa, org);
    if (!to) return;

    const bookings = await queryDocuments(sa, 'bookings', [{ field: 'eventId', op: 'EQUAL', value: order.eventId }]).catch(() => []);
    const avail = buildAvailability({ ...ev, id: order.eventId }, bookings);
    const soldLine = avail.capacity ? `${avail.sold} of ${avail.capacity}` : String(avail.sold);
    const amount = paid(session.amount_total, session.currency);

    const html = layout(
      `You sold ${order.quantity} ticket${order.quantity === 1 ? '' : 's'}`,
      para(`A new order just came in for ${ev.title}.`) +
        `<table style="border-collapse:collapse;width:100%">${[
          row('Order', order.orderId),
          row('Tickets', `${order.quantity} × ${order.tierName}`),
          row('Paid', amount),
          row('Promo code', m.promo || ''),
          row('Buyer', order.buyerName),
          row('Buyer email', EMAIL_RE.test(order.ticketEmail) ? order.ticketEmail : ''),
          row('Tickets sold so far', soldLine),
          row('Event', eventDateLine(ev)),
        ].join('')}</table>`,
      { label: 'See your orders', href: `${SITE}/organizer/orders` },
      'You get an email for every order. You can turn these off in your organiser portal under Account.',
    );
    await sendEmail(mail, {
      to,
      subject: `New order — ${order.quantity} × ${order.tierName} — ${ev.title}`,
      html,
      replyTo: ADMIN_INBOX,
    });
  } catch (err: any) {
    console.error(`Order ${order.orderId}: organiser sale email failed:`, err?.message || err);
  }
}

/** Tell an organiser's followers that their new event is on sale — once per
 *  event, by email (blind-copied) and as a notification in their account. */
export async function announceToFollowers(
  sa: ServiceAccount | null,
  mail: MailConfig | null,
  eventId: string,
  ev: DocData,
  org: DocData,
): Promise<number> {
  if (ev.status !== 'published' || ev.followersNotifiedAt) return 0;
  const targets = [...new Set([org.id, org.userId].filter((x) => typeof x === 'string' && x))];
  const follows = (
    await Promise.all(
      targets.map((t) =>
        queryDocuments(sa, 'follows', [
          { field: 'targetType', op: 'EQUAL', value: 'organizer' },
          { field: 'targetId', op: 'EQUAL', value: t },
        ]).catch(() => [] as DocData[]),
      ),
    )
  ).flat();
  const followerIds = [...new Set(follows.map((f) => String(f.followerId || '')).filter(Boolean))].slice(0, 2000);
  // Claim first, so a second approval click can't send it twice.
  await patchDocument(sa, `events/${eventId}`, { followersNotifiedAt: new Date().toISOString() }, { mustExist: true });
  if (!followerIds.length) return 0;

  const now = new Date().toISOString();
  const title = String(ev.title || 'A new event');
  const orgName = String(org.companyName || 'An organiser you follow');
  await commitWrites(
    sa,
    followerIds.map((uid) => ({
      set: {
        path: `notifications/${eventId}-new-${uid}`.slice(0, 1400),
        data: {
          id: `${eventId}-new-${uid}`,
          userId: uid,
          title: `New from ${orgName}`,
          message: `${title} is on sale — ${eventDateLine(ev)}.`,
          read: false,
          createdAt: now,
        },
      },
    })),
  ).catch((err) => console.error('Follower notifications not saved:', err?.message || err));

  if (!mail) return followerIds.length;
  const profiles = await Promise.all(followerIds.map((uid) => getDocument(sa, `users/${uid}`).catch(() => null)));
  const emails = [...new Set(profiles.map((p) => String(p?.email || '').toLowerCase()).filter((e) => EMAIL_RE.test(e)))];
  const link = `${SITE}/events/${encodeURIComponent(eventId)}`;
  const html = layout(
    `${orgName} just announced a new event`,
    para(`${title} is now on sale on Jazba Tickets.`) + para(eventDateLine(ev)),
    { label: 'See the event', href: link },
    `You’re receiving this because you follow ${orgName} on Jazba Tickets. To stop, unfollow them on their page: ${SITE}/organizers/${encodeURIComponent(String(org.id))}`,
  );
  for (let i = 0; i < emails.length; i += 45) {
    try {
      await sendEmail(mail, { to: ADMIN_INBOX, bcc: emails.slice(i, i + 45).join(', '), subject: `New event: ${title}`, html, replyTo: ADMIN_INBOX });
    } catch (err: any) {
      console.error('Follower email batch failed:', err?.message || err);
    }
  }
  return followerIds.length;
}
