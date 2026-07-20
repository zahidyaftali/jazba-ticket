import { sendEmail, escapeHtml } from './sendEmail.js';

// Every form on the site (Contact, Book-an-artist, Help centre, Newsletter)
// notifies the same inbox — this is the one place that decides the subject
// line and body for each form, so adding a new form is a one-line addition
// below rather than a new endpoint.
const NOTIFY_TO = 'info@jazbatickets.com';

export interface FormEmailBody {
  formName?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
  artistName?: unknown;
}

class FormEmailError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max = 4000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

const FORM_TITLES: Record<string, string> = {
  contact: 'Contact form',
  'artist-booking': 'Book-an-artist enquiry',
  help: 'Help centre message',
  newsletter: 'Newsletter signup',
};

function row(label: string, value: string): string {
  if (!value) return '';
  return `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#111">${escapeHtml(value).replace(/\n/g, '<br/>')}</td></tr>`;
}

export async function sendFormEmail(apiKey: string, body: FormEmailBody): Promise<void> {
  const formName = str(body.formName, 40) || 'contact';
  const name = str(body.name, 200);
  const email = str(body.email, 200);
  const phone = str(body.phone, 60);
  const subject = str(body.subject, 200);
  const message = str(body.message, 5000);
  const artistName = str(body.artistName, 200);

  if (!email || !EMAIL_RE.test(email)) {
    throw new FormEmailError('A valid email address is required.');
  }
  if (formName !== 'newsletter' && !message) {
    throw new FormEmailError('A message is required.');
  }

  const title = FORM_TITLES[formName] || 'Website form';
  const emailSubject =
    formName === 'newsletter'
      ? `New newsletter subscriber — ${email}`
      : `${title}${subject ? `: ${subject}` : ''}${name ? ` — ${name}` : ''}`;

  const rows = [
    row('Form', title),
    row('Name', name || '—'),
    row('Email', email),
    row('Phone', phone),
    row('Artist', artistName),
    row('Subject', subject),
  ].filter(Boolean).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(title)}</h2>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
      ${message ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee;font-size:14px;white-space:pre-line;color:#111">${escapeHtml(message)}</div>` : ''}
      <p style="margin-top:24px;font-size:11px;color:#999">Sent from the Jazba Tickets website.</p>
    </div>`;

  await sendEmail(apiKey, {
    to: NOTIFY_TO,
    subject: emailSubject,
    html,
    replyTo: email,
  });
}

export { FormEmailError };
