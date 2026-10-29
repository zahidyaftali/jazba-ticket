import { sendEmail, escapeHtml, type MailConfig } from './sendEmail.js';

// Emails an e-ticket to a ticket holder. Used by the admin portal ("Issue
// ticket" and "Email ticket"), so only a signed-in admin may call it —
// otherwise anyone could use the Jazba mailbox to send mail. Shared by the
// Vercel function (api/send-ticket-email.ts) and the Vite dev middleware.

// Public Firebase web config (same values shipped in the frontend bundle).
const FIREBASE = {
  projectId: 'gen-lang-client-0037466749',
  apiKey: 'AIzaSyBn7JXZLWICgJ4Bw6bNBUWfWQ5XAng6gdU',
  databaseId: 'ai-studio-3fd360dc-3f27-4806-97c6-a0dfddc09741',
};
// Mirrors BOOTSTRAP_ADMIN_EMAIL in src/services/backendService.ts.
const BOOTSTRAP_ADMIN_EMAIL = 'zahidyaftali999@gmail.com';

export class TicketEmailError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Verify the Firebase ID token and confirm the account is an admin. */
async function verifyAdmin(idToken: string): Promise<{ uid: string; email: string }> {
  if (!idToken) throw new TicketEmailError('Please sign in to the admin portal again.', 401);
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data: any = await lookup.json().catch(() => ({}));
  const user = data?.users?.[0];
  if (!lookup.ok || !user?.localId) throw new TicketEmailError('Please sign in to the admin portal again.', 401);
  const email = String(user.email || '').toLowerCase();
  if (email === BOOTSTRAP_ADMIN_EMAIL) return { uid: user.localId, email };

  // Read the caller's own profile as the caller — security rules allow that.
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}` +
    `/databases/${FIREBASE.databaseId}/documents/users/${encodeURIComponent(user.localId)}` +
    `?key=${FIREBASE.apiKey}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  const profile: any = await res.json().catch(() => ({}));
  if (!res.ok || profile?.fields?.role?.stringValue !== 'admin') {
    throw new TicketEmailError('Only admins can send tickets.', 403);
  }
  return { uid: user.localId, email };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export interface TicketEmailBody {
  idToken?: unknown;
  to?: unknown;
  holderName?: unknown;
  eventTitle?: unknown;
  category?: unknown;
  date?: unknown;
  time?: unknown;
  venue?: unknown;
  tierName?: unknown;
  quantity?: unknown;
  orderId?: unknown;
  seat?: unknown;
  code?: unknown;
  amount?: unknown;
  message?: unknown;
}

/** Decorative barcode bars built from the ticket code — the same look as the
 *  printed ticket. A table, because email clients don't render SVG. */
function barcodeHtml(seed: string): string {
  const base = seed || 'JAZBA';
  const cells = base
    .repeat(Math.ceil(40 / base.length))
    .slice(0, 40)
    .split('')
    .map((ch) => {
      const w = (ch.charCodeAt(0) % 4) + 1;
      return (
        `<td width="${w}" height="56" style="width:${w}px;height:56px;background:#000000;font-size:0;line-height:0">&nbsp;</td>` +
        `<td width="2" height="56" style="width:2px;height:56px;background:#ffffff;font-size:0;line-height:0">&nbsp;</td>`
      );
    })
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>${cells}</tr></table>`;
}

function detail(label: string, value: string): string {
  return `
    <td valign="top" width="50%" style="padding:14px 12px 0 0;font-family:Arial,Helvetica,sans-serif">
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#666666">${escapeHtml(label)}</div>
      <div style="font-size:14px;font-weight:700;color:#000000;margin-top:4px;line-height:1.35">${escapeHtml(value || '—')}</div>
    </td>`;
}

export async function sendTicketEmail(mail: MailConfig, body: TicketEmailBody): Promise<void> {
  await verifyAdmin(str(body.idToken, 4096));
  const { to, subject, html } = buildTicketEmail(body);
  await sendEmail(mail, { to, subject, html });
}

/** Validate the ticket fields and render the e-ticket email (no sending). */
export function buildTicketEmail(body: TicketEmailBody): { to: string; subject: string; html: string } {
  const to = str(body.to, 200);
  if (!to || !EMAIL_RE.test(to)) throw new TicketEmailError("The client's email address doesn't look right.");

  const holderName = str(body.holderName, 120) || 'Guest';
  const eventTitle = str(body.eventTitle, 200);
  if (!eventTitle) throw new TicketEmailError('The ticket is missing its event.');
  const category = str(body.category, 40);
  const date = str(body.date, 80);
  const time = str(body.time, 80);
  const venue = str(body.venue, 200);
  const tierName = str(body.tierName, 80) || 'General admission';
  const quantity = Math.min(500, Math.max(1, Math.floor(Number(body.quantity) || 1)));
  const orderId = str(body.orderId, 40);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(orderId)) throw new TicketEmailError('The ticket is missing its order number.');
  const seat = str(body.seat, 20);
  const code = str(body.code, 60) || orderId;
  const amount = str(body.amount, 40);
  const message = str(body.message, 1500);
  const firstName = holderName.split(/\s+/)[0];

  const overline = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#666666';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your ticket</title></head>
<body style="margin:0;padding:0;background:#f2f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:2px solid #000000;font-family:Arial,Helvetica,sans-serif;color:#000000">
    <tr><td style="background:#000000;padding:18px 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="font-family:Arial,Helvetica,sans-serif">
          <span style="display:inline-block;width:28px;height:28px;line-height:28px;background:#ffed00;color:#000000;font-weight:800;font-size:16px;text-align:center;vertical-align:middle">J</span>
          <span style="color:#ffffff;font-weight:700;font-size:13px;letter-spacing:4px;vertical-align:middle;padding-left:8px">JAZBA TICKETS</span>
        </td>
        <td align="right" valign="middle">
          <span style="display:inline-block;background:#ffed00;color:#000000;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:6px 10px">${escapeHtml(tierName)}</span>
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:28px 24px 0">
      <p style="margin:0 0 10px;font-size:15px;color:#000000">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#333333">Your ticket for <strong>${escapeHtml(eventTitle)}</strong> is below. Show it at the entrance — on your phone or printed.</p>
    </td></tr>

    ${message ? `<tr><td style="padding:18px 24px 0">
      <div style="border-left:3px solid #ffed00;background:#f7f7f7;padding:12px 14px;font-size:14px;line-height:1.55;color:#222222;white-space:pre-line">${escapeHtml(message)}</div>
    </td></tr>` : ''}

    <tr><td style="padding:26px 24px 0">
      <div style="${overline}">${category ? `${escapeHtml(category)} · ` : ''}E-ticket · Order ${escapeHtml(orderId)}</div>
      <h1 style="margin:8px 0 0;font-size:26px;line-height:1.1;font-weight:800;color:#000000">${escapeHtml(eventTitle)}</h1>
    </td></tr>

    <tr><td style="padding:18px 24px 26px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000000">
        <tr>${detail('Date', date)}${detail('Time', time)}</tr>
        <tr>${detail('Venue', venue)}${detail('Admits', `${quantity} × ${tierName}${seat ? ` · ${seat}` : ''}`)}</tr>
        <tr>${detail('Ticket holder', holderName)}${detail(amount ? 'Paid' : 'Email', amount || to)}</tr>
      </table>
    </td></tr>

    <tr><td align="center" style="border-top:2px dashed #000000;padding:24px 24px 22px">
      ${barcodeHtml(`${code}${orderId}`)}
      <div style="font-size:13px;font-weight:700;letter-spacing:5px;margin-top:10px;color:#000000">${escapeHtml(code)}</div>
      <div style="font-size:11px;color:#666666;margin-top:8px">Show this code at the entrance to be admitted.</div>
    </td></tr>

    <tr><td style="background:#f7f7f7;padding:16px 24px;font-size:11px;line-height:1.6;color:#666666">
      Issued and verified by Jazba Tickets. Questions about your booking? Just reply to this email, or write to support@jazbatickets.com.<br/>
      <a href="https://jazbatickets.com" style="color:#000000;font-weight:700;text-decoration:underline">jazbatickets.com</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  return { to, subject: `Your ticket — ${eventTitle}`, html };
}
