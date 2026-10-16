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

const DEFAULT_FROM = 'Jazba Tickets <onboarding@resend.dev>';

// Until a sending domain is verified in Resend, its shared test sender only
// delivers to the Resend account owner and rejects every other recipient
// with a 403 that names the owner's address. Rather than every form failing,
// redeliver to that inbox. Once jazbatickets.com is verified and
// RESEND_FROM_EMAIL is set, mail goes to the real recipient and this never runs.
const TEST_MODE_RE = /only send testing emails to your own email address \(([^\s()]+@[^\s()]+)\)/;

async function postToResend(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const body = res.ok ? '' : await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body };
}

export async function sendEmail(apiKey: string, input: SendEmailInput): Promise<void> {
  const payload = {
    from: input.from || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    reply_to: input.replyTo || undefined,
    attachments: input.attachments?.length ? input.attachments : undefined,
  };
  let res = await postToResend(apiKey, payload);

  const owner = !res.ok && res.status === 403 ? res.body.match(TEST_MODE_RE)?.[1] : undefined;
  if (owner && owner.toLowerCase() !== input.to.toLowerCase()) {
    console.warn(`Resend is in testing mode — delivering to the account owner instead of ${input.to}. Verify a domain at resend.com/domains.`);
    res = await postToResend(apiKey, { ...payload, to: [owner], subject: `[for ${input.to}] ${input.subject}` });
  }

  if (!res.ok) {
    throw new Error(`Resend API error (${res.status}): ${res.body || 'unknown error'}`);
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
