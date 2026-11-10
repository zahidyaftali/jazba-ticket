// Vercel serverless function: POST /api/admin-media
// Body: { idToken, action: 'list' | 'upload' | 'delete', ... }. The image
// library — see api/_lib/mediaLibrary.ts. Admins see and manage every image;
// an approved organiser only their own folder.
import { HttpError, verifyAccount } from '../_lib/adminAuth.js';
import { deleteMedia, listMedia, mediaConfigured, uploadMedia } from '../_lib/mediaLibrary.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const caller = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '');
    if (!caller.isAdmin && !caller.isOrganizer) throw new HttpError('Only admins and approved organisers can upload images.', 403);
    // An admin inside an organiser's portal works in that organiser's folder.
    const actingFor = caller.isAdmin && typeof body.organizerId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.organizerId) ? body.organizerId : '';
    const owner = caller.isAdmin ? actingFor || undefined : caller.uid;
    if (!mediaConfigured(process.env)) {
      res.status(200).json({ configured: false, items: [] });
      return;
    }
    switch (body.action) {
      case 'upload': {
        const item = await uploadMedia(body, owner);
        console.log(`Media uploaded by ${caller.email}: ${item.pathname} (${item.size} bytes)`);
        res.status(200).json({ configured: true, item });
        return;
      }
      case 'delete':
        await deleteMedia(body.url, owner);
        console.log(`Media deleted by ${caller.email}: ${body.url}`);
        res.status(200).json({ configured: true, deleted: true });
        return;
      default:
        res.status(200).json({ configured: true, items: await listMedia(owner) });
    }
  } catch (err: any) {
    if (!(err instanceof HttpError)) console.error('admin-media failed:', err?.message || err);
    res.status(err instanceof HttpError ? err.status : 502).json({
      error: err instanceof HttpError ? err.message : 'Could not reach the media library right now.',
    });
  }
}
