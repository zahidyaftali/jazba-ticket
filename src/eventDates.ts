import { EventItem, eventPath } from './types';

// ── Event dates, places and calendar links ────────────────────────────────
// Events carry a display date ("8 Nov" + year), an optional last day
// (endsOn, yyyy-mm-dd) and a free-text time ("19:00", "Doors 18:00",
// "7:30 PM"). Everything here reads those fields — nothing is stored.

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const DAY = 24 * 60 * 60 * 1000;

/** The event's first day (local midnight), or null when the date can't be read. */
export function eventStartDay(event: EventItem): Date | null {
  const m = (event.date || '').match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  const yearMatch = (event.year || event.fullDate || '').match(/(20\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  return new Date(year, month, Number(m[1]));
}

/** The event's last day (local midnight) — tours run until their last show. */
export function eventEndDay(event: EventItem): Date | null {
  const start = eventStartDay(event);
  const ends = (event.endsOn || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ends) {
    const end = new Date(Number(ends[1]), Number(ends[2]) - 1, Number(ends[3]));
    if (!start || end >= start) return end;
  }
  return start;
}

/** Sort key: when the event starts (unknown dates sort last). */
export function eventSortTime(event: EventItem): number {
  return eventStartDay(event)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

// ── "When" filters, as on the events page ──────────────────────────────────

export const DATE_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week', label: 'This week' },
  { id: 'next-week', label: 'Next week' },
  { id: 'month', label: 'This month' },
] as const;

export type DateFilterId = (typeof DATE_FILTERS)[number]['id'];

/** [start, end) in ms for a "when" filter, counted from today. */
export function dateWindow(id: DateFilterId, now = new Date()): [number, number] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const at = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days).getTime();
  const weekday = today.getDay(); // 0 = Sunday
  const toSunday = (7 - weekday) % 7; // days left until (and including) Sunday
  switch (id) {
    case 'today':
      return [at(0), at(1)];
    case 'tomorrow':
      return [at(1), at(2)];
    case 'weekend': {
      // Friday to Sunday; on a Saturday or Sunday it starts today.
      const friday = weekday === 0 ? 0 : Math.max(0, 5 - weekday);
      return [at(friday), at(toSunday + 1)];
    }
    case 'week':
      return [at(0), at(toSunday + 1)];
    case 'next-week':
      return [at(toSunday + 1), at(toSunday + 8)];
    case 'month':
      return [at(0), new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime()];
  }
}

/** True when any day of the event falls inside the window. */
export function eventInWindow(event: EventItem, [from, to]: [number, number]): boolean {
  const start = eventStartDay(event);
  if (!start) return false;
  const end = eventEndDay(event) || start;
  return start.getTime() < to && end.getTime() + DAY > from;
}

/** The home-page search sends 0 / 1 / 3 for Today / Tomorrow / Weekend. */
export function dateFilterFromOffset(offset: number | null | undefined): DateFilterId | null {
  if (offset === 0) return 'today';
  if (offset === 1) return 'tomorrow';
  if (offset === 3) return 'weekend';
  return null;
}

// ── Places ─────────────────────────────────────────────────────────────────

const COUNTRY = /^(uk|u\.k\.|united kingdom|england|scotland|wales|pakistan|uae|united arab emirates|usa|us|united states|canada|india)$/i;

/** City names in an event's location, e.g. "Lok Virsa, Islamabad" → ["Islamabad"],
 *  "Birmingham, Manchester & London, UK" → all three. */
export function eventCities(event: EventItem): string[] {
  const parts = (event.location || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !COUNTRY.test(p) && !/\btba\b/i.test(p));
  if (parts.length === 0) return [];
  const isTour = /&| and /i.test(event.location) || (event.shows?.length || 0) > 1;
  const picked = isTour
    ? parts.flatMap((p) => p.split(/\s*(?:&|\band\b)\s*/i))
    : [parts[parts.length - 1]];
  // "Dubai Expo 2020 — Jubilee Stage" style parts are venues, not cities.
  return Array.from(new Set(picked.map((c) => c.trim()).filter((c) => c && c.length <= 30 && !/\d/.test(c))));
}

/** A Google Maps directions link, or '' when the venue isn't a real place yet. */
export function directionsUrl(event: EventItem): string {
  const where = (event.location || '').trim();
  if (!where || /\btba\b/i.test(where) || COUNTRY.test(where) || /&/.test(where) || (event.shows?.length || 0) > 1) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}`;
}

/** The venue's time zone, guessed from the location; '' when unsure. */
export function eventTimeZone(event: EventItem): string {
  const where = ` ${(event.location || '').toLowerCase()} `;
  const has = (words: string) => new RegExp(`\\b(${words})\\b`).test(where);
  if (has('pakistan|lahore|islamabad|karachi|rawalpindi|peshawar|faisalabad|multan|quetta|sialkot|gujranwala')) return 'Asia/Karachi';
  if (has('uk|united kingdom|england|scotland|wales|london|birmingham|manchester|leeds|bradford|glasgow|edinburgh|leicester|luton|sheffield|liverpool|nottingham|cardiff|coventry|slough|wembley')) return 'Europe/London';
  if (has('uae|dubai|abu dhabi|sharjah')) return 'Asia/Dubai';
  return '';
}

// ── Start / end times ──────────────────────────────────────────────────────

interface Wall { y: number; m: number; d: number; h: number; min: number }

/** Clock times written in the event's time field, e.g. "Doors 18:00" → [18:00]. */
function parseTimes(text: string): Array<{ h: number; min: number }> {
  const out: Array<{ h: number; min: number }> = [];
  const re = /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const [, hh, mm, ap] = match;
    if (!mm && !ap) continue; // a bare number isn't a time
    let h = Number(hh);
    const min = mm ? Number(mm) : 0;
    if (ap) {
      const pm = ap.toLowerCase().startsWith('p');
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
    }
    if (h > 23 || min > 59) continue;
    out.push({ h, min });
  }
  return out;
}

export interface EventSchedule {
  allDay: boolean;
  start: Wall;
  /** Exclusive for all-day events (the day after the last day). */
  end: Wall;
  timeZone: string;
}

export function eventSchedule(event: EventItem): EventSchedule | null {
  const first = eventStartDay(event);
  if (!first) return null;
  const last = eventEndDay(event) || first;
  const times = parseTimes(event.time || '');
  const timeZone = eventTimeZone(event);
  const wall = (d: Date, h = 0, min = 0): Wall => ({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), h, min });

  // Several days (a tour) or no clock time: an all-day entry.
  if (times.length === 0 || last.getTime() > first.getTime()) {
    const after = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    return { allDay: true, start: wall(first), end: wall(after), timeZone };
  }
  const startAt = times[0];
  let endH = startAt.h + 3;
  let endMin = startAt.min;
  if (times[1]) {
    endH = times[1].h + (times[1].h * 60 + times[1].min <= startAt.h * 60 + startAt.min ? 24 : 0);
    endMin = times[1].min;
  }
  const endDay = new Date(first.getFullYear(), first.getMonth(), first.getDate() + Math.floor(endH / 24));
  return {
    allDay: false,
    start: wall(first, startAt.h, startAt.min),
    end: wall(endDay, endH % 24, endMin),
    timeZone,
  };
}

/** How far a time zone is from UTC at a given moment, in ms. */
function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')) - utcMs;
}

/** The UTC moment of a wall-clock time at the venue. */
function wallToUtc(w: Wall, timeZone: string): Date {
  const guess = Date.UTC(w.y, w.m, w.d, w.h, w.min);
  let utc = guess - zoneOffset(guess, timeZone);
  const second = guess - zoneOffset(utc, timeZone);
  if (second !== utc) utc = second; // around a clock change
  return new Date(utc);
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateOnly = (w: Wall) => `${w.y}${pad(w.m + 1)}${pad(w.d)}`;
const floating = (w: Wall) => `${dateOnly(w)}T${pad(w.h)}${pad(w.min)}00`;
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Start and end in calendar format; exact (UTC) when the venue's zone is known. */
function stamps(s: EventSchedule): { start: string; end: string; utc: boolean } {
  if (s.allDay) return { start: dateOnly(s.start), end: dateOnly(s.end), utc: false };
  if (s.timeZone) {
    try {
      return { start: utcStamp(wallToUtc(s.start, s.timeZone)), end: utcStamp(wallToUtc(s.end, s.timeZone)), utc: true };
    } catch {
      /* zone unknown to this browser — fall back to the venue's clock time */
    }
  }
  return { start: floating(s.start), end: floating(s.end), utc: false };
}

export interface CalendarExtras {
  /** Order number, when adding a bought ticket. */
  orderId?: string;
}

function eventLink(event: EventItem): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jazbatickets.com';
  return `${origin}${eventPath(event)}`;
}

function details(event: EventItem, extras?: CalendarExtras): string {
  const lines = [];
  if (extras?.orderId) lines.push(`Order ${extras.orderId} — show the QR code on your e-ticket at the door.`);
  if (event.time && !/^\s*tba\s*$/i.test(event.time)) lines.push(`Time: ${event.time}`);
  lines.push(`Event details: ${eventLink(event)}`);
  return lines.join('\n');
}

export function googleCalendarUrl(event: EventItem, extras?: CalendarExtras): string {
  const s = eventSchedule(event);
  if (!s) return '';
  const { start, end } = stamps(s);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: details(event, extras),
    location: event.location || '',
  });
  if (!s.allDay && s.timeZone) p.set('ctz', s.timeZone);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(event: EventItem, extras?: CalendarExtras): string {
  const s = eventSchedule(event);
  if (!s) return '';
  const iso = (w: Wall) => `${w.y}-${pad(w.m + 1)}-${pad(w.d)}`;
  let startdt: string;
  let enddt: string;
  if (s.allDay) {
    startdt = iso(s.start);
    enddt = iso(s.end);
  } else if (s.timeZone) {
    startdt = wallToUtc(s.start, s.timeZone).toISOString();
    enddt = wallToUtc(s.end, s.timeZone).toISOString();
  } else {
    startdt = `${iso(s.start)}T${pad(s.start.h)}:${pad(s.start.min)}:00`;
    enddt = `${iso(s.end)}T${pad(s.end.h)}:${pad(s.end.min)}:00`;
  }
  const p = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt,
    enddt,
    location: event.location || '',
    body: details(event, extras),
  });
  if (s.allDay) p.set('allday', 'true');
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

const icsText = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 characters continue on the next line, indented by a space. */
function fold(line: string): string {
  const chars = Array.from(line);
  if (chars.length <= 70) return line;
  const out: string[] = [];
  for (let i = 0; i < chars.length; i += 70) out.push(chars.slice(i, i + 70).join(''));
  return out.join('\r\n ');
}

/** An .ics file for Apple Calendar, Outlook and anything else. */
export function icsFile(event: EventItem, extras?: CalendarExtras): string {
  const s = eventSchedule(event);
  if (!s) return '';
  // Times end in Z (UTC) when the venue's zone is known, else they're the
  // venue's clock time and show as written.
  const { start, end } = stamps(s);
  const when = s.allDay
    ? [`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`]
    : [`DTSTART:${start}`, `DTEND:${end}`];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jazba Tickets//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${(extras?.orderId || event.id).replace(/[^A-Za-z0-9-]/g, '')}@jazbatickets.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    ...when,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location || '')}`,
    `DESCRIPTION:${icsText(details(event, extras))}`,
    `URL:${eventLink(event)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(event: EventItem, extras?: CalendarExtras) {
  const body = icsFile(event, extras);
  if (!body) return;
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(event.slug || event.id).slice(0, 60)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
