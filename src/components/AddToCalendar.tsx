import React, { useEffect, useRef, useState } from 'react';
import { CalendarPlus, ChevronDown, Navigation } from 'lucide-react';
import { EventItem } from '../types';
import {
  CalendarExtras, directionsUrl, downloadIcs, eventSchedule, googleCalendarUrl, outlookCalendarUrl,
} from '../eventDates';

const baseBtn = 'inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 cursor-pointer transition-colors';
const tone = {
  dark: 'border border-white/40 text-white hover:border-white hover:bg-white/10',
  light: 'border border-black text-black bg-white hover:bg-[#f7f7f7]',
};

/** "Add to calendar" with Google, Outlook.com and an .ics file (Apple / Outlook). */
export function AddToCalendar({
  event, extras, variant = 'light', className = '',
}: { event: EventItem; extras?: CalendarExtras; variant?: 'dark' | 'light'; className?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!eventSchedule(event)) return null;

  const item = 'block w-full text-left px-4 py-3 text-sm font-bold text-black hover:bg-[#f7f7f7] cursor-pointer';
  return (
    <div ref={box} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${baseBtn} ${tone[variant]} w-full`}
      >
        <CalendarPlus className="w-4 h-4" /> Add to calendar <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-1 z-40 min-w-full w-56 bg-white border border-black shadow-lg">
          <a role="menuitem" className={item} href={googleCalendarUrl(event, extras)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            Google Calendar
          </a>
          <button role="menuitem" type="button" className={`${item} border-t border-[#f2f2f2]`} onClick={() => { downloadIcs(event, extras); setOpen(false); }}>
            Apple Calendar
          </button>
          <button role="menuitem" type="button" className={`${item} border-t border-[#f2f2f2]`} onClick={() => { downloadIcs(event, extras); setOpen(false); }}>
            Outlook (desktop)
          </button>
          <a role="menuitem" className={`${item} border-t border-[#f2f2f2]`} href={outlookCalendarUrl(event, extras)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            Outlook.com
          </a>
        </div>
      )}
    </div>
  );
}

/** "Get directions" to the venue in Google Maps — hidden while the venue is TBA. */
export function DirectionsLink({
  event, variant = 'light', className = '',
}: { event: EventItem; variant?: 'dark' | 'light'; className?: string }) {
  const href = directionsUrl(event);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`${baseBtn} ${tone[variant]} ${className}`}
    >
      <Navigation className="w-4 h-4" /> Get directions
    </a>
  );
}
