// Vercel serverless function: POST /api/admin-media
// Body: { idToken, action: 'list' | 'upload' | 'delete', ... }. Admins only.
// The admin portal's image library — see api/_lib/mediaLibrary.ts.
import { HttpError, verifyAdmin } from './_lib/adminAuth.js';
import { deleteMedia, listMedia, mediaConfigured, uploadMedia } from './_lib/mediaLibrary.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const admin = await verifyAdmin(typeof body.idToken === 'string' ? body.idToken : '', 'Only admins can manage the media library.');
    if (!mediaConfigured(process.env)) {
      res.status(200).json({ configured: false, items: [] });
      return;
    }
    switch (body.action) {
      case 'upload': {
        const item = await uploadMedia(body);
        console.log(`Media uploaded by ${admin.email}: ${item.pathname} (${item.size} bytes)`);
        res.status(200).json({ configured: true, item });
        return;
      }
      case 'delete':
        await deleteMedia(body.url);
        console.log(`Media deleted by ${admin.email}: ${body.url}`);
        res.status(200).json({ configured: true, deleted: true });
        return;
      default:
        res.status(200).json({ configured: true, items: await listMedia() });
    }
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('admin-media failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not reach the media library right now.',
    });
  }
}
