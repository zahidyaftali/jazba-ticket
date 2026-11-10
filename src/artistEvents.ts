import type { EventItem } from './types';

// ── An artist's own shows ────────────────────────────────────────────────
// An event features an artist when their name is in its line-up, its title,
// its description or the event page text (jazbaentertainment.com posts name
// performers in the copy, e.g. "featuring Asim Azhar").

const norm = (s: unknown) =>
  ` ${String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

function eventText(event: EventItem): string {
  const parts: string[] = [event.title, event.description || '', ...(event.lineup || []).map((a) => a.name)];
  for (const section of event.content || []) {
    if (section.heading) parts.push(section.heading);
    for (const block of section.blocks) {
      if (block.type === 'paragraph') parts.push(block.runs.map((r) => r.text).join(''));
      else if (block.type === 'subheading') parts.push(block.text);
      else if (block.type === 'list') parts.push(block.items.map((runs) => runs.map((r) => r.text).join('')).join(' · '));
      else if (block.type === 'table') parts.push([...block.head, ...block.rows.flat()].join(' '));
    }
  }
  return norm(parts.join(' \n '));
}

export function eventFeaturesArtist(event: EventItem, artistName: string): boolean {
  const name = norm(artistName).trim();
  if (name.length < 3) return false;
  // Whole words only: "Ali" mustn't match "Alina".
  return eventText(event).includes(` ${name} `);
}
