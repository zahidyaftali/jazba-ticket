import { useEffect, useState } from 'react';
import { AvailableTier, EventItem, tierSalesEnded } from './types';
import { EventAvailability, fetchAvailability } from './services/organizerToolsService';

/** Tickets left for a site event, refreshed when the tab comes back into
 *  view. null while loading, for WordPress events, or if it can't be read
 *  (the payment server checks again before charging). */
export function useAvailability(event: Pick<EventItem, 'id'>): EventAvailability | null {
  const [avail, setAvail] = useState<EventAvailability | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAvail(null);
    const load = () => fetchAvailability(event.id).then((a) => { if (!cancelled) setAvail(a); });
    void load();
    const onFocus = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [event.id]);
  return avail;
}

export interface TierState {
  soldOut: boolean;
  ended: boolean;
  /** null = no limit (or unknown). */
  left: number | null;
  /** Can be bought right now. */
  open: boolean;
}

export function tierState(tier: AvailableTier, avail: EventAvailability | null): TierState {
  const a = avail?.tiers[tier.tier];
  const ended = tierSalesEnded(tier) || !!a?.salesEnded;
  const left = a ? a.left : avail ? avail.left : null;
  const soldOut = left !== null && left <= 0;
  return { soldOut, ended, left, open: !soldOut && !ended };
}

/** A short "sales end" label, e.g. "Sales end Fri 14 Nov, 18:00". */
export function salesEndLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `Sales end ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
