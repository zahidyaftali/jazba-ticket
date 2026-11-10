// POST /api/my-ticket  { idToken, orderId }
// A buyer downloads their own e-ticket as a PDF (the same ticket that's
// emailed): only for an order on their own account.
import { HttpError, verifyAccount } from '../_lib/adminAuth.js';
import { serviceAccountFromEnv } from '../_lib/firebaseAuthUsers.js';
import { getDocument } from '../_lib/firestoreAdmin.js';
import { buildTicketPdf, parseTicket } from '../_lib/ticketEmail.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const account = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '', 'Please sign in again to download your ticket.');
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(orderId)) throw new HttpError('Unknown order.');
    const sa = serviceAccountFromEnv(process.env);
    if (!sa) throw new HttpError('Downloads aren’t set up on the server yet.', 503);
    const b = await getDocument(sa, `bookings/${orderId}`);
    if (!b || (b.userId !== account.uid && !account.isAdmin)) throw new HttpError('That ticket isn’t on your account.', 404);
    if (b.bookingStatus === 'cancelled') throw new HttpError('This order was cancelled.', 410);

    // Event details: saved on the order; else from the event itself.
    let ev: any = null;
    if (!b.eventTitle && b.eventId && !String(b.eventId).startsWith('wp-')) ev = await getDocument(sa, `events/${b.eventId}`).catch(() => null);
    const t = parseTicket(
      {
        to: '',
        holderName: b.billingName,
        eventTitle: b.eventTitle || ev?.title || 'Jazba Tickets event',
        category: ev?.category || '',
        date: b.eventDate || ev?.fullDate || '',
        time: b.eventTime || ev?.time || '',
        venue: b.eventVenue || ev?.location || '',
        tierName: b.tierName || b.ticketType || 'General admission',
        quantity: b.quantity,
        orderId,
        seat: b.seat || '',
        code: orderId,
        amount: '',
        message: '',
        image: b.eventImage || ev?.image || '',
      },
      false,
    );
    const bytes = await buildTicketPdf(t);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Jazba-Ticket-${orderId}.pdf"`);
    res.status(200).send(Buffer.from(bytes));
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('my-ticket failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({ error: err instanceof HttpError ? err.message : 'The ticket could not be created. Please try again.' });
  }
}
