// Client-side loader for the events published on jazbaentertainment.com.
// The serverless endpoint does the WordPress fetch and mapping — see
// api/wp-events.ts and api/_lib/wordpressEvents.ts.

import { EventItem } from '../types';

const LOAD_TIMEOUT_MS = 20000;

/** Every jazbaentertainment.com event, or [] if they can't be loaded — the
 *  rest of the site keeps working with its own events either way. */
export async function getWordPressEvents(): Promise<EventItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
  try {
    const res = await fetch('/api/wp-events', { signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return Array.isArray(data.events) ? data.events : [];
  } catch (err) {
    console.error('getWordPressEvents failed:', err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
