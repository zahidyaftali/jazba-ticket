// One shared copy of the media library for the whole admin portal, so the
// Media page and every image picker show the same list without refetching.
import { useEffect, useSyncExternalStore } from "react";
import {
  MEDIA_NOT_CONFIGURED,
  deleteMediaImage,
  fetchMediaLibrary,
  uploadImage,
  type MediaFolder,
  type MediaItem,
} from "../../../services/adminMediaService";
import type { AdminData } from "../AdminContext";

interface MediaState {
  status: "idle" | "loading" | "ready" | "error";
  configured: boolean;
  items: MediaItem[];
  error: string;
}

let state: MediaState = { status: "idle", configured: true, items: [], error: "" };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function setState(patch: Partial<MediaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadMedia(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && (state.status === "ready" || state.status === "loading")) return Promise.resolve();
  // Keep showing the current images while a refresh runs.
  if (state.status !== "ready") setState({ status: "loading", error: "" });
  inflight = fetchMediaLibrary()
    .then((r) => setState({ status: "ready", configured: r.configured, items: r.items, error: "" }))
    .catch((err) => setState({ status: "error", error: err?.message || "Could not load the media library." }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function uploadToLibrary(file: File, folder: MediaFolder): Promise<MediaItem> {
  try {
    const item = await uploadImage(file, folder);
    setState({ configured: true, items: [item, ...state.items.filter((i) => i.url !== item.url)] });
    return item;
  } catch (err: any) {
    if (err?.message === MEDIA_NOT_CONFIGURED) setState({ configured: false });
    throw err;
  }
}

export async function removeFromLibrary(url: string): Promise<void> {
  await deleteMediaImage(url);
  setState({ items: state.items.filter((i) => i.url !== url) });
}

export function useMediaLibrary() {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    void loadMedia();
  }, []);
  return { ...snapshot, refresh: () => loadMedia(true) };
}

/** Image URL → where it appears on the site, e.g. "Event · Lahore Night (banner)". */
export function mediaUsage(data: AdminData): Map<string, string[]> {
  const uses = new Map<string, string[]>();
  const add = (url: unknown, where: string) => {
    if (typeof url !== "string" || !url) return;
    const list = uses.get(url) || [];
    if (!list.includes(where)) list.push(where);
    uses.set(url, list);
  };
  for (const e of data.events) {
    const t = e.title || "Untitled event";
    add(e.bannerImage || e.image, `Event · ${t} (banner)`);
    add(e.organizerImage, `Event · ${t} (organiser logo)`);
    (e.lineup || []).forEach((l: any) => add(l?.avatar, `Event · ${t} (lineup photo)`));
    (e.gallery || []).forEach((g: string) => add(g, `Event · ${t} (gallery)`));
  }
  for (const a of data.artists) {
    add(a.profileImage, `Artist · ${a.stageName || "Unnamed"} (profile)`);
    add(a.coverImage, `Artist · ${a.stageName || "Unnamed"} (cover)`);
  }
  for (const o of data.organizers) {
    add(o.logoUrl, `Organiser · ${o.companyName || "Unnamed"} (logo)`);
    add(o.bannerUrl, `Organiser · ${o.companyName || "Unnamed"} (banner)`);
  }
  for (const u of data.users) add(u.profileImage, `User · ${u.name || u.email} (photo)`);
  return uses;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
