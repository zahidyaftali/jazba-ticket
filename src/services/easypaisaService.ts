// Client side of the manual Easypaisa payment option on the checkout. The
// buyer sends the order total to the account below and submits a screenshot
// of the receipt; api/easypaisa-order.ts emails it to the team to verify.

export const EASYPAISA_ACCOUNT = '03032111064';
/** Grouped for reading aloud / typing into the app: 0303 2111064. */
export const EASYPAISA_ACCOUNT_DISPLAY = '0303 2111064';

export interface PreparedScreenshot {
  type: string;
  /** base64 file bytes, no data: prefix */
  data: string;
  previewUrl: string;
}

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
// Raw files are only sent untouched when the browser can't re-encode them.
const MAX_RAW_BYTES = 2.8 * 1024 * 1024;
const MAX_EDGE = 2000;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = url;
  });
}

/** Downscale and re-encode a phone screenshot to a JPEG small enough to
 *  upload, keeping the receipt text legible. */
export async function prepareScreenshot(file: File): Promise<PreparedScreenshot> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG or PNG).');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That image is too large. Please choose one under 15 MB.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { type: 'image/jpeg', data: dataUrl.split(',')[1], previewUrl: dataUrl };
  } catch {
    if (!ACCEPTED.includes(file.type) || file.size > MAX_RAW_BYTES) {
      throw new Error('We couldn\'t read that image. Please upload a JPG or PNG screenshot.');
    }
    const dataUrl = await readAsDataUrl(file);
    return { type: file.type, data: dataUrl.split(',')[1], previewUrl: dataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface EasypaisaOrderPayload {
  eventId: string;
  tier: string;
  quantity: number;
  promoCode: string;
  idToken: string;
  fullName: string;
  email: string;
  phone: string;
  screenshot: { type: string; data: string };
}

export async function submitEasypaisaOrder(
  payload: EasypaisaOrderPayload,
): Promise<{ orderRef: string; amountPkr: number }> {
  let res: Response;
  try {
    res = await fetch('/api/easypaisa-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.orderRef) {
    throw new Error(data.error || 'Could not submit your payment. Please try again.');
  }
  return data;
}
