// The .js extension is required: this repo is ESM ("type": "module") and
// Vercel compiles each TS file separately, so Node needs the exact path.
import { sendFormEmail, FormEmailError } from './_lib/formEmail.js';

// Vercel serverless function: POST /api/send-form-email
// Body: { formName, name?, email, phone?, subject?, message? }
// Every form on the site (Contact, Book-an-artist, Help, Newsletter) posts
// here; the message always lands in info@jazbatickets.com with the sender's
// address set as Reply-To.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Email delivery is not configured on the server.' });
    return;
  }

  try {
    await sendFormEmail(apiKey, req.body ?? {});
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('send-form-email failed:', err?.message || err);
    const status = err instanceof FormEmailError ? err.status : 502;
    res.status(status).json({ error: err?.message || 'Could not send your message. Please try again.' });
  }
}
