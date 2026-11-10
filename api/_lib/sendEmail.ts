import nodemailer from 'nodemailer';

// Sends the site's notification emails through the info@jazbatickets.com
// Zoho mailbox over SMTP — no third-party email service. Shared by every
// form on the site and the Easypaisa checkout, in both the Vercel functions
// and the Vite dev middleware.

export interface SendEmailInput {
  to: string;
  /** Extra visible recipient(s), comma-separated. */
  cc?: string;
  /** Hidden recipients, comma-separated (mailings to many people). */
  bcc?: string;
  subject: string;
  html: string;
  /** Lets the admin hit "Reply" and land straight in the sender's inbox. */
  replyTo?: string;
  /** Files to attach — content is the file's bytes as a base64 string.
   *  Give a `cid` to show an image inline: <img src="cid:that-id">. */
  attachments?: { filename: string; content: string; contentType?: string; cid?: string }[];
}

export interface MailConfig {
  host: string;
  user: string;
  pass: string;
}

/** SMTP settings from the environment, or null when no password is set. */
export function mailConfigFromEnv(env: Record<string, string | undefined>): MailConfig | null {
  const pass = env.ZOHO_SMTP_PASSWORD || '';
  if (!pass) return null;
  return {
    // Zoho's server for custom-domain mailboxes in its US region (jazbatickets.com's MX is mx.zoho.com).
    host: env.ZOHO_SMTP_HOST || 'smtppro.zoho.com',
    user: env.ZOHO_SMTP_USER || 'info@jazbatickets.com',
    pass,
  };
}

/** A plain email address (the rule browsers use for email fields): no
 *  quotes, commas, angle brackets, comments or non-ASCII, so there is nothing
 *  for the mail library's address parser to misread into another recipient. */
export const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isValidEmail(address: string): boolean {
  return address.length <= 254 && EMAIL_RE.test(address);
}

/** A comma-separated address list, every one checked. */
function addressList(list: string | undefined, field: string): string[] {
  const out = (list || '').split(',').map((a) => a.trim()).filter(Boolean);
  for (const a of out) if (!isValidEmail(a)) throw new Error(`Email not sent: the ${field} address is not valid.`);
  return out;
}

export async function sendEmail(config: MailConfig, input: SendEmailInput): Promise<void> {
  const to = addressList(input.to, 'to');
  if (!to.length) throw new Error('Email not sent: no recipient.');
  const cc = addressList(input.cc, 'cc');
  const bcc = addressList(input.bcc, 'bcc');
  const replyTo = addressList(input.replyTo, 'reply-to')[0];

  const transport = nodemailer.createTransport({
    host: config.host,
    port: 465,
    secure: true,
    auth: { user: config.user, pass: config.pass },
    // Fail inside the serverless time limit rather than hanging.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  await transport.sendMail({
    // Zoho only relays mail sent from the signed-in mailbox itself.
    from: { name: 'Jazba Tickets', address: config.user },
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    replyTo,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      encoding: 'base64',
      ...(a.contentType ? { contentType: a.contentType } : {}),
      ...(a.cid ? { cid: a.cid } : {}),
    })),
  });
}

/** Escape user-supplied text before dropping it into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
