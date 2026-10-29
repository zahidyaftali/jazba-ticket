// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { sendTicketEmail, ticketPdfForAdmin, TicketEmailError } from './_lib/ticketEmail.js';
import { mailConfigFromEnv } from './_lib/sendEmail.js';

// Vercel serverless function: POST /api/send-ticket-email
// Body: { idToken, to, holderName, eventTitle, date, time, venue, tierName,
//         quantity, orderId, seat?, code?, amount?, message?, image?, download? }
// Admin-only. Emails a branded e-ticket (with the ticket attached as a PDF)
// to the ticket holder — or, with `download: true`, returns that PDF.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body ?? {};

  try {
    if (body.download) {
      const { bytes, filename } = await ticketPdfForAdmin(body);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(Buffer.from(bytes));
      return;
    }

    const mail = mailConfigFromEnv(process.env);
    if (!mail) {
      res.status(500).json({ error: 'Email is not set up on the server (ZOHO_SMTP_PASSWORD is missing).' });
      return;
    }
    await sendTicketEmail(mail, body);
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('send-ticket-email failed:', err?.message || err);
    if (err instanceof TicketEmailError) {
      res.status(err.status).json({ error: err.message });
    } else {
      res.status(502).json({
        error: body.download
          ? 'The PDF could not be created. Please try again in a moment.'
          : 'The email could not be sent. Please try again in a moment.',
      });
    }
  }
}
