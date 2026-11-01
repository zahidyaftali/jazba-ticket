// Vercel serverless function behind the admin and organiser portal routes.
// Vercel's Hobby plan allows 12 functions per deployment, so these six share
// one: vercel.json rewrites /api/admin-media, /api/organizer-portal, … here
// with ?route=<name>, and the URLs the browser uses stay the same. Each
// route's own code lives in api/_routes/ (folders starting with _ aren't
// turned into functions).
import adminMedia from './_routes/admin-media.js';
import adminPayments from './_routes/admin-payments.js';
import adminSecurityRules from './_routes/admin-security-rules.js';
import adminUsers from './_routes/admin-users.js';
import organizerNotify from './_routes/organizer-notify.js';
import organizerPortal from './_routes/organizer-portal.js';

const ROUTES: Record<string, (req: any, res: any) => Promise<void>> = {
  'admin-media': adminMedia,
  'admin-payments': adminPayments,
  'admin-security-rules': adminSecurityRules,
  'admin-users': adminUsers,
  'organizer-notify': organizerNotify,
  'organizer-portal': organizerPortal,
};

/** The route name from ?route=, or else from the request path (/api/<name>). */
function routeOf(req: any): string {
  const q = req.query?.route;
  if (typeof q === 'string' && q) return q;
  const path = String(req.url || '').split('?')[0];
  return path.replace(/^\/api\//, '').replace(/\/+$/, '');
}

export default async function handler(req: any, res: any) {
  const route = ROUTES[routeOf(req)];
  if (!route) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await route(req, res);
}
