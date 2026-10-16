import nodemailer from 'nodemailer';

// Sends the site's notification emails through the info@jazbatickets.com
// Zoho mailbox over SMTP — no third-party email service. Shared by every
// form on the site and the Easypaisa checkout, in both the Vercel functions
// and the Vite dev middleware.

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Lets the admin hit "Reply" and land straight in the sender's inbox. */
  replyTo?: string;
  /** Files to attach — content is the file's bytes as a base64 string. */
  attachments?: { filename: string; content: string }[];
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

export async function sendEmail(config: MailConfig, input: SendEmailInput): Promise<void> {
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
    to: input.to,
    replyTo: input.replyTo || undefined,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content, encoding: 'base64' })),
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
