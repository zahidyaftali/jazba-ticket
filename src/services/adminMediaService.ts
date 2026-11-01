// Admin portal → POST /api/admin-media (see api/admin-media.ts): the image
// library behind every image field in the admin. Photos are shrunk in the
// browser before upload, so a 6 MB phone photo goes up as ~300 KB.

import { auth } from '../firebase';

export const MEDIA_FOLDERS = ['events', 'artists', 'organisers', 'people', 'other'] as const;
/** 'partners' holds each organiser's own uploads (media/partners/<uid>/). */
export type MediaFolder = (typeof MEDIA_FOLDERS)[number] | 'partners';

export const MEDIA_FOLDER_LABELS: Record<MediaFolder, string> = {
  events: 'Events',
  artists: 'Artists',
  organisers: 'Organisers',
  people: 'People',
  other: 'Other',
  partners: 'Organiser uploads',
};

export interface MediaItem {
  url: string;
  pathname: string;
  folder: MediaFolder;
  name: string;
  size: number;
  uploadedAt: string;
}

export const MEDIA_NOT_CONFIGURED =
  'Image uploads aren’t switched on yet: create a Public Blob store in the Vercel project (Storage → Create → Blob), then redeploy.';

/** Longest side of an uploaded image, in pixels. Wide enough for a full-width banner. */
const MAX_EDGE = 2000;
/** Mirrors MAX_MEDIA_BYTES in api/_lib/mediaLibrary.ts. */
const MAX_BYTES = 3 * 1024 * 1024;
const KEEP_AS_IS = ['image/jpeg', 'image/png', 'image/webp'];

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/** Resize to at most MAX_EDGE and re-encode (WebP where the browser can). */
export async function prepareImage(file: File): Promise<Blob> {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    throw new Error('SVG files aren’t supported — please save the image as PNG or JPG.');
  }
  if (type && !type.startsWith('image/')) throw new Error(`“${file.name}” isn’t an image.`);
  if (type === 'image/gif') {
    // Re-drawing would lose the animation, so GIFs go up untouched.
    if (file.size > MAX_BYTES) throw new Error('GIFs must be under 3 MB.');
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(`Couldn’t read “${file.name}”. Please use a JPG, PNG or WebP image.`);
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error(`Couldn’t read “${file.name}”.`);
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser can’t prepare images for upload.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let out = await canvasBlob(canvas, 'image/webp', 0.82);
  if (!out || out.type !== 'image/webp') {
    // Older Safari can't write WebP: keep PNG for transparency, JPEG for photos.
    out = await canvasBlob(canvas, type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
  }
  // An already-small original that needed no resizing is kept as it is.
  if (scale === 1 && KEEP_AS_IS.includes(type) && (!out || file.size <= out.size)) out = file;
  if (!out) throw new Error(`Couldn’t prepare “${file.name}” for upload.`);
  if (out.size > MAX_BYTES) throw new Error(`“${file.name}” is still over 3 MB after shrinking — please use a smaller image.`);
  return out;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Couldn’t read the image.'));
    reader.readAsDataURL(blob);
  });
}

async function callMedia(payload: Record<string, unknown>): Promise<any> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Your admin session has expired — please sign in again.');
  let res: Response;
  try {
    res = await fetch('/api/admin-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...payload }),
    });
  } catch {
    throw new Error('Could not reach the server.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || (res.status === 413 ? 'That image is too large (3 MB max).' : 'The media library could not be reached.'));
  }
  return data;
}

export async function fetchMediaLibrary(): Promise<{ configured: boolean; items: MediaItem[] }> {
  const data = await callMedia({ action: 'list' });
  return { configured: data.configured !== false, items: Array.isArray(data.items) ? data.items : [] };
}

/** Shrink, then upload one image. Resolves with the saved library item. */
export async function uploadImage(file: File, folder: MediaFolder): Promise<MediaItem> {
  const blob = await prepareImage(file);
  const data = await callMedia({ action: 'upload', folder, name: file.name, data: await toBase64(blob) });
  if (data.configured === false || !data.item) throw new Error(MEDIA_NOT_CONFIGURED);
  return data.item as MediaItem;
}

export async function deleteMediaImage(url: string): Promise<void> {
  await callMedia({ action: 'delete', url });
}
