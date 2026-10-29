// Admin portal → POST /api/send-ticket-email (see api/_lib/ticketEmail.ts).
// The server re-checks that the signed-in account is an admin.

import { auth } from '../firebase';

export interface TicketEmailPayload {
  to: string;
  holderName: string;
  eventTitle: string;
  category?: string;
  date: string;
  time: string;
  venue: string;
  tierName: string;
  quantity: number;
  orderId: string;
  seat?: string;
  code: string;
  /** Shown on the ticket as "Paid", e.g. "PKR 6,000" — omit for complimentary. */
  amount?: string;
  /** Optional personal note shown above the ticket. */
  message?: string;
}

export async function sendTicketEmail(payload: TicketEmailPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { ok: false, error: 'Your admin session has expired — please sign in again.' };
    const res = await fetch('/api/send-ticket-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'The email could not be sent. Please try again.' };
    return { ok: true };
  } catch (err) {
    console.error('sendTicketEmail failed:', err);
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}
