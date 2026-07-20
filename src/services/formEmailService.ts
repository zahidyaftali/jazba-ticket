// Client-side helper for every form on the site that should notify
// info@jazbatickets.com. All forms post to the same serverless endpoint —
// see api/send-form-email.ts for the delivery logic.

export interface FormEmailPayload {
  formName: 'contact' | 'artist-booking' | 'help' | 'newsletter';
  name?: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  artistName?: string;
}

/** Posts the form to the server and returns true on success, false on failure. */
export async function sendFormEmail(payload: FormEmailPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-form-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not send your message. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('sendFormEmail failed:', err);
    return { ok: false, error: 'Could not reach the server. Please check your connection and try again.' };
  }
}
