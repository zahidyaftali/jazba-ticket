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
}

const DEFAULT_FROM = 'Jazba Tickets <onboarding@resend.dev>';

export async function sendEmail(apiKey: string, input: SendEmailInput): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: input.from || DEFAULT_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo || undefined,
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
