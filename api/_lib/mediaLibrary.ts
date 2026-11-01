// The admin portal's media library: images uploaded for events, artists and
// organisers, kept in the project's Vercel Blob store under media/<folder>/.
// The store must be Public, since these images appear on the public site.
// Credentials come from the env vars Vercel adds when the store is connected
// to the project (BLOB_STORE_ID + OIDC, or BLOB_READ_WRITE_TOKEN).
import { del, list, put } from '@vercel/blob';
import { HttpError } from './adminAuth.js';

export const MEDIA_FOLDERS = ['events', 'artists', 'organisers', 'people', 'other'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** Largest file accepted (the browser shrinks photos well below this first). */
export const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
const ROOT = 'media/';

export interface MediaItem {
  url: string;
  pathname: string;
  folder: MediaFolder;
  name: string;
  size: number;
  uploadedAt: string;
}

export function mediaConfigured(env: Record<string, string | undefined>): boolean {
  return !!(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID);
}

/** The image type from the file's first bytes; never trust the sender's label. */
function sniffImage(buf: Buffer): { type: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'image/png', ext: 'png' };
  if (buf.toString('latin1', 0, 4) === 'GIF8') return { type: 'image/gif', ext: 'gif' };
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  const brand = buf.toString('latin1', 4, 12);
  if (brand === 'ftypavif' || brand === 'ftypavis') return { type: 'image/avif', ext: 'avif' };
  return null;
}

/** "My Poster (final).JPG" → "my-poster-final". */
function slugName(name: string): string {
  const base = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '');
  const slug = base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'image';
}

function asFolder(value: unknown): MediaFolder {
  return (MEDIA_FOLDERS as readonly string[]).includes(String(value)) ? (value as MediaFolder) : 'other';
}

function toItem(b: { url: string; pathname: string; size: number; uploadedAt: Date | string }): MediaItem {
  const parts = b.pathname.split('/');
  return {
    url: b.url,
    pathname: b.pathname,
    folder: asFolder(parts[1]),
    name: parts[parts.length - 1] || b.pathname,
    size: b.size,
    uploadedAt: new Date(b.uploadedAt).toISOString(),
  };
}

/** A friendlier message for the errors an admin can actually fix. */
function storageError(err: any): HttpError {
  const msg = String(err?.message || err || '');
  console.error('media library:', msg);
  if (/private/i.test(msg)) {
    return new HttpError('The Vercel image store is set to Private. Images on the site need a Public store — create a new Blob store with Public access.', 502);
  }
  if (/credentials|token|unauthori[sz]ed|forbidden|access denied/i.test(msg)) {
    return new HttpError('The server could not sign in to Vercel image storage. Check the Blob store is connected to this project, then redeploy.', 502);
  }
  if (/suspended|limit|quota/i.test(msg)) {
    return new HttpError('Vercel image storage refused the request — the plan’s storage limit may have been reached.', 502);
  }
  return new HttpError('Vercel image storage is not responding right now. Please try again.', 502);
}

export async function listMedia(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  let cursor: string | undefined;
  try {
    for (let page = 0; page < 10; page++) {
      const res = await list({ prefix: ROOT, limit: 1000, cursor });
      for (const b of res.blobs) if (!b.pathname.endsWith('/')) items.push(toItem(b));
      if (!res.hasMore || !res.cursor) break;
      cursor = res.cursor;
    }
  } catch (err) {
    throw storageError(err);
  }
  return items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function uploadMedia(input: { folder?: unknown; name?: unknown; data?: unknown }): Promise<MediaItem> {
  const data = typeof input.data === 'string' ? input.data : '';
  if (!data) throw new HttpError('No image was sent.');
  if (data.length > Math.ceil((MAX_MEDIA_BYTES * 4) / 3) + 8) throw new HttpError('That image is too large (3 MB max).', 413);
  const buf = Buffer.from(data, 'base64');
  if (!buf.length) throw new HttpError('No image was sent.');
  if (buf.length > MAX_MEDIA_BYTES) throw new HttpError('That image is too large (3 MB max).', 413);
  const kind = sniffImage(buf);
  if (!kind) throw new HttpError('Only JPG, PNG, WebP, GIF or AVIF images can be uploaded.', 415);

  const folder = asFolder(input.folder);
  try {
    const blob = await put(`${ROOT}${folder}/${slugName(String(input.name || ''))}.${kind.ext}`, buf, {
      access: 'public',
      contentType: kind.type,
      addRandomSuffix: true,
      // Every upload gets a unique name, so browsers may keep it for a year.
      cacheControlMaxAge: 365 * 24 * 60 * 60,
    });
    return toItem({ url: blob.url, pathname: blob.pathname, size: buf.length, uploadedAt: new Date() });
  } catch (err) {
    throw storageError(err);
  }
}

export async function deleteMedia(url: unknown): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    throw new HttpError('That is not a media library image.');
  }
  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.endsWith('.public.blob.vercel-storage.com') ||
    !parsed.pathname.startsWith(`/${ROOT}`)
  ) {
    throw new HttpError('That is not a media library image.');
  }
  try {
    await del(parsed.origin + parsed.pathname);
  } catch (err) {
    throw storageError(err);
  }
}
