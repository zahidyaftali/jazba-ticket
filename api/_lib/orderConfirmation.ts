import type Stripe from 'stripe';
// The .js extensions are required: Vercel runs these as native ESM.
import { sendEmail, escapeHtml, type MailConfig } from './sendEmail.js';
import { buildTicketEmail, parseTicket, ticketAttachments, type TicketFields } from './ticketEmail.js';
import { retrieveCheckoutSession, wordPressEventDetails, type VerifiedCheckoutSession } from './stripePayment.js';
import { WP_EVENT_PREFIX, fetchWordPressEvent } from './wordpressEvents.js';

// Runs when a card buyer lands back on /checkout/success. Once Stripe
// confirms the payment, the buyer is emailed their e-ticket (PDF attached)
// and info@ gets a "new order" notice with the same ticket — each exactly
// once per payment. The Stripe payment itself remembers what was sent (in
// its metadata), so a refreshed success page never sends a second copy.
// Shared by api/get-checkout-session.ts and the Vite dev middleware.

const NOTIFY_TO = 'info@jazbatickets.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConfirmedOrder extends VerifiedCheckoutSession {
  /** Who the e-ticket was emailed to — '' when it hasn't been sent. */
  ticketEmailedTo: string;
}

/** Verify a Checkout Session with Stripe and, if it's paid, send the order
 *  emails. Email trouble never fails the confirmation — the booking still
 *  gets written and the ticket still shows on screen. */
export async function confirmCheckoutSession(
  secretKey: string,
  sessionId: string,
  mail: MailConfig | null,
  origin: string,
): Promise<ConfirmedOrder> {
  const { stripe, session, order } = await retrieveCheckoutSession(secretKey, sessionId);
  if (!order.paid) return { ...order, ticketEmailedTo: '' };
  if (!mail) {
    console.error(`Order ${order.orderId}: emails not sent — ZOHO_SMTP_PASSWORD is not set.`);
    return { ...order, ticketEmailedTo: '' };
  }
  try {
    return { ...order, ticketEmailedTo: await deliverOrderEmails(stripe, session, order, mail, origin) };
  } catch (err: any) {
    console.error(`Order ${order.orderId}: order emails failed:`, err?.message || err);
    return { ...order, ticketEmailedTo: '' };
  }
}

/** The amount Stripe charged, e.g. "Rs 1,800" or "£8.36". */
export function paidLabel(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor == null || !currency) return '';
  const cur = currency.toUpperCase();
  const value = amountMinor / 100;
  if (cur === 'PKR') return `Rs ${Math.round(value).toLocaleString('en-US')}`;
  const n = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cur === 'GBP') return `£${n}`;
  if (cur === 'USD') return `$${n}`;
  return `${n} ${cur}`;
}

/** The e-ticket for this order, from the details saved on the session. */
async function ticketFor(session: Stripe.Checkout.Session, order: VerifiedCheckoutSession, amount: string): Promise<TicketFields> {
  const m = session.metadata || {};
  let title = m.event_title || '';
  let details = {
    date: m.event_date || '',
    time: m.event_time || '',
    venue: m.event_venue || '',
    image: m.event_image || '',
    category: m.event_category || '',
  };
  // Checkouts started before event details were stored on the session.
  if (!title && order.eventId.startsWith(WP_EVENT_PREFIX)) {
    const event = await fetchWordPressEvent(order.eventId).catch(() => null);
    if (event) {
      title = event.title;
      details = wordPressEventDetails(event);
    }
  }
  return parseTicket(
    {
      to: order.ticketEmail,
      holderName: order.buyerName,
      eventTitle: title || 'Your Jazba Tickets event',
      ...details,
      tierName: order.tierName,
      quantity: order.quantity,
      orderId: order.orderId,
      seat: order.seat,
      code: order.orderId,
      amount,
      message:
        `Thanks for booking with Jazba Tickets — your card payment${amount ? ` of ${amount}` : ''} went through. ` +
        'You can also find this ticket any time under My tickets in your profile at jazbatickets.com.',
    },
    false,
  );
}

function row(label: string, value: string, href = ''): string {
  if (!value) return '';
  const shown = href
    ? `<a href="${escapeHtml(href)}" style="color:#000;font-weight:700">${escapeHtml(value)}</a>`
    : escapeHtml(value);
  return `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#111">${shown}</td></tr>`;
}

export async function deliverOrderEmails(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  order: VerifiedCheckoutSession,
  mail: MailConfig,
  origin: string,
): Promise<string> {
  const pi = session.payment_intent && typeof session.payment_intent === 'object' ? session.payment_intent : null;
  if (!pi) {
    console.error(`Order ${order.orderId}: no payment on the session — emails not sent.`);
    return '';
  }
  const sent = pi.metadata || {};

  // The e-ticket goes to the email typed at checkout, with the login email
  // copied in when it's a different address.
  const to = EMAIL_RE.test(order.ticketEmail) ? order.ticketEmail : EMAIL_RE.test(order.buyerEmail) ? order.buyerEmail : '';
  const cc = to && EMAIL_RE.test(order.buyerEmail) && order.buyerEmail.toLowerCase() !== to.toLowerCase() ? order.buyerEmail : '';
  const recipients = [to, cc].filter(Boolean).join(', ');

  const needTicket = !!to && !sent.ticket_emailed_at;
  const needNotice = !sent.admin_notified_at;
  if (!needTicket && !needNotice) return sent.ticket_emailed_to || '';

  // Mark the payment first, so a refresh a moment later doesn't send copies.
  const now = new Date().toISOString();
  const claim: Record<string, string> = {};
  if (needTicket) claim.ticket_emailed_at = now;
  if (needNotice) claim.admin_notified_at = now;
  await stripe.paymentIntents.update(pi.id, { metadata: claim });

  let ticketOk = false;
  let noticeOk = false;
  try {
    const amount = paidLabel(session.amount_total, session.currency);
    const ticket = await ticketFor(session, order, amount);
    const { pdf, inline } = await ticketAttachments(ticket);

    const ticketEmail = async () => {
      const { subject, html } = buildTicketEmail({ ...ticket, to });
      await sendEmail(mail, { to, cc, subject, html, attachments: [pdf, ...inline] });
    };

    const adminNotice = async () => {
      const adminUrl = `${origin}/admin/orders?order=${encodeURIComponent(order.orderId)}`;
      const rows = [
        row('Order', order.orderId, adminUrl),
        row('Event', ticket.eventTitle),
        row('Date', [ticket.date, ticket.time].filter(Boolean).join(' · ')),
        row('Venue', ticket.venue),
        row('Package', ticket.tierName),
        row('No. of tickets', String(order.quantity)),
        row('Promo code', session.metadata?.promo || ''),
        row('Sale', session.metadata?.sale ? `${session.metadata.sale} off` : ''),
        row('Paid by card', amount),
        row('Buyer', order.buyerName),
        row('Ticket emailed to', recipients || 'NO EMAIL ADDRESS — please send this ticket manually'),
        row('Account email', order.buyerEmail && order.buyerEmail.toLowerCase() !== to.toLowerCase() ? order.buyerEmail : ''),
        row('Stripe payment', pi.id, `https://dashboard.stripe.com/payments/${pi.id}`),
      ].filter(Boolean).join('');
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="font-size:18px;margin:0 0 4px">New card order — ${escapeHtml(amount || order.orderId)}</h2>
          <p style="font-size:13px;color:#666;margin:0 0 16px">Paid on Stripe. The buyer has been emailed the attached e-ticket; the order is in the admin portal under Orders.</p>
          <table style="border-collapse:collapse;width:100%">${rows}</table>
          <p style="margin-top:20px"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#000;color:#ffed00;font-weight:700;font-size:13px;padding:10px 16px;text-decoration:none">Open in admin</a></p>
          <p style="margin-top:24px;font-size:11px;color:#999">Sent automatically by the Jazba Tickets checkout.</p>
        </div>`;
      await sendEmail(mail, {
        to: NOTIFY_TO,
        subject: `New card order ${order.orderId} — ${amount} — ${ticket.eventTitle} — ${order.buyerName || recipients || 'buyer'}`,
        html,
        replyTo: to || undefined,
        attachments: [pdf],
      });
    };

    const [ticketResult, noticeResult] = await Promise.allSettled([
      needTicket ? ticketEmail() : Promise.resolve(),
      needNotice ? adminNotice() : Promise.resolve(),
    ]);
    ticketOk = needTicket && ticketResult.status === 'fulfilled';
    noticeOk = needNotice && noticeResult.status === 'fulfilled';
    if (needTicket && ticketResult.status === 'rejected') {
      console.error(`Order ${order.orderId}: ticket email failed:`, ticketResult.reason?.message || ticketResult.reason);
    }
    if (needNotice && noticeResult.status === 'rejected') {
      console.error(`Order ${order.orderId}: info@ notice failed:`, noticeResult.reason?.message || noticeResult.reason);
    }
  } finally {
    // Record who got the ticket; clear the marks of anything that failed so
    // the next visit to the success page tries again.
    const update: Record<string, string> = {};
    if (needTicket) {
      if (ticketOk) update.ticket_emailed_to = recipients;
      else update.ticket_emailed_at = '';
    }
    if (needNotice && !noticeOk) update.admin_notified_at = '';
    if (Object.keys(update).length) {
      await stripe.paymentIntents.update(pi.id, { metadata: update }).catch((err: any) => {
        console.error(`Order ${order.orderId}: could not record sent emails:`, err?.message || err);
      });
    }
  }

  if (needTicket) return ticketOk ? recipients : '';
  return sent.ticket_emailed_to || '';
}
