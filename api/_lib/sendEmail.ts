// Thin wrapper around the Resend REST API — no SDK dependency needed, just
// fetch (available natively in both Vercel's Node runtime and the Vite dev
// middleware). Shared by every form on the site that needs to notify
// info@jazbatickets.com.

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Lets the admin hit "Reply" and land straight in the sender's inbox. */
  replyTo?: string;
  from?: string;
  /** Files to attach — content is the file's bytes as a base64 string. */
  attachments?: { filename: string; content: string }[];
}

// Sends from the site's own domain, which must be verified at
// resend.com/domains — Resend's shared onboarding@resend.dev sender can only
// reach the Resend account owner, never info@jazbatickets.com.
// RESEND_FROM_EMAIL overrides this if a different sender is ever needed.
const DEFAULT_FROM = 'Jazba Tickets <no-reply@jazbatickets.com>';

export async function sendEmail(apiKey: string, input: SendEmailInput): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: input.from || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo || undefined,
      attachments: input.attachments?.length ? input.attachments : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${body || 'unknown error'}`);
  }
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
