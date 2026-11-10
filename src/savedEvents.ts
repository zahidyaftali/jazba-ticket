import { useCallback, useEffect, useState } from 'react';

// ── Saved events (the heart button) ───────────────────────────────────────
// One list shared by every page: event cards, the event page, the events
// explorer and "Saved" in the account. Kept in this browser (the key is the
// one the explorer already used, so earlier saves carry over). Changes reach
// every mounted component, and other open tabs, straight away.

const KEY = 'jazba_liked_events';
const CHANGED = 'jz-saved-events-changed';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked — the change still applies for this page view */
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: ids }));
}

export function useSavedEvents() {
  const [savedIds, setSavedIds] = useState<string[]>(read);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      setSavedIds(Array.isArray(detail) ? detail : read());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSavedIds(read());
    };
    window.addEventListener(CHANGED, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGED, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]);
  }, []);

  const removeSaved = useCallback((id: string) => {
    write(read().filter((x) => x !== id));
  }, []);

  return { savedIds, isSaved, toggleSaved, removeSaved };
}
