// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { sendTicketEmail, TicketEmailError } from './_lib/ticketEmail.js';
import { mailConfigFromEnv } from './_lib/sendEmail.js';

// Vercel serverless function: POST /api/send-ticket-email
// Body: { idToken, to, holderName, eventTitle, date, time, venue, tierName,
//         quantity, orderId, seat?, code?, amount?, message? }
// Admin-only: emails a branded e-ticket to the ticket holder.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const mail = mailConfigFromEnv(process.env);
  if (!mail) {
    res.status(500).json({ error: 'Email is not set up on the server (ZOHO_SMTP_PASSWORD is missing).' });
    return;
  }

  try {
    await sendTicketEmail(mail, req.body ?? {});
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('send-ticket-email failed:', err?.message || err);
    if (err instanceof TicketEmailError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(502).json({ error: 'The email could not be sent. Please try again in a moment.' });
    }
  }
}
