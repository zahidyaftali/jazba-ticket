import type { EventItem } from './types';
import { getAllOrganizers, getOrganizerById, getOrganizerProfile, type OrganizerProfile } from './services/backendService';

// ── Who is behind an event ────────────────────────────────────────────────
// Organisers who signed up themselves own their events by account id (their
// profile's id is that same account id). Profiles an admin made earlier have
// a random id, and their events only carry the organiser's name. Events from
// jazbaentertainment.com carry a name too. This finds the public profile in
// every case, so Follow buttons and follower counts point at the same
// profile everywhere (the organiser page follows the profile id).

let allOrganizers: Promise<OrganizerProfile[]> | null = null;

function organizersList(): Promise<OrganizerProfile[]> {
  if (!allOrganizers) allOrganizers = getAllOrganizers().catch(() => []);
  return allOrganizers;
}

const isPublic = (o: OrganizerProfile | null | undefined): o is OrganizerProfile =>
  !!o && (!o.status || o.status === 'approved');

const norm = (s: unknown) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** The approved organiser profile behind an event, or null. */
export async function resolveEventOrganizer(event: Pick<EventItem, 'organizerName'> & { organizerId?: string }): Promise<OrganizerProfile | null> {
  const ownerId = event.organizerId || '';
  if (ownerId) {
    const own = await getOrganizerById(ownerId);
    if (own) return isPublic(own) ? own : null;
  }
  const name = norm(event.organizerName);
  if (name) {
    const match = (await organizersList()).find((o) => isPublic(o) && norm(o.companyName) === name);
    if (match) return match;
    return null; // a named organiser without a profile: nothing to follow
  }
  if (ownerId) {
    const byAccount = await getOrganizerProfile(ownerId);
    if (isPublic(byAccount)) return byAccount;
  }
  return null;
}

/** Does this event belong to that organiser profile? */
export function eventBelongsTo(event: EventItem & { organizerId?: string }, org: OrganizerProfile): boolean {
  const selfRegistered = !!org.id && org.id === org.userId;
  if (selfRegistered && event.organizerId === org.userId) return true;
  return !!org.companyName && norm(event.organizerName) === norm(org.companyName);
}
