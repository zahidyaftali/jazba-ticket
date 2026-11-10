import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {createCheckoutSession, getOrigin} from './api/_lib/stripePayment';
import {confirmCheckoutSession} from './api/_lib/orderConfirmation';
import {sendFormEmail, FormEmailError} from './api/_lib/formEmail';
import {submitEasypaisaOrder} from './api/_lib/easypaisaOrder';
import {sendTicketEmail, ticketPdfForAdmin, TicketEmailError} from './api/_lib/ticketEmail';
import {HttpError, verifyAccount, verifyAdmin} from './api/_lib/adminAuth';
import {organizerReport} from './api/_lib/organizerPortal';
import {sendOrganizerNotice} from './api/_lib/organizerEmails';
import {listAuthUsers, serviceAccountFromEnv} from './api/_lib/firebaseAuthUsers';
import {listCardPayments} from './api/_lib/stripeLedger';
import {getRulesStatus, publishRules} from './api/_lib/securityRules';
import {deleteMedia, listMedia, mediaConfigured, uploadMedia} from './api/_lib/mediaLibrary';
import {mailConfigFromEnv, type MailConfig} from './api/_lib/sendEmail';
import {fetchWordPressEvents, fetchWordPressSlug} from './api/_lib/wordpressEvents';
import {SHARE_BOT_UA, renderEventSharePage} from './api/_lib/eventShare';
import availabilityRoute from './api/_routes/availability';
import promoCheckRoute from './api/_routes/promo-check';
import organizerToolsRoute from './api/_routes/organizer-tools';
import myTicketRoute from './api/_routes/my-ticket';

/** Runs a Vercel-style route ((req, res) with res.status().json()) on the
 *  dev server, so newer routes need no hand-written copy here. */
function vercelRoute(handler: (req: any, res: any) => Promise<void>) {
  return async (req: any, res: any) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const shimReq = { method: req.method, headers: req.headers, query: Object.fromEntries(url.searchParams), body, socket: req.socket, url: req.url };
    const shimRes: any = {
      setHeader: (k: string, v: string) => res.setHeader(k, v),
      status(code: number) {
        res.statusCode = code;
        return shimRes;
      },
      json(data: unknown) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      },
      send(data: unknown) {
        res.end(data);
      },
    };
    await handler(shimReq, shimRes);
  };
}

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

// Serves the same API routes Vercel runs in production during `npm run dev`,
// so Stripe checkout and form emails both work locally too.
const devApi = (secrets: { stripeSecretKey: string; mail: MailConfig | null; env: Record<string, string> }): Plugin => ({
  name: 'jazba-dev-api',
  configureServer(server) {
    // Routes written for Vercel read their settings from process.env.
    for (const k of ['FIREBASE_SERVICE_ACCOUNT', 'ZOHO_SMTP_PASSWORD', 'ZOHO_SMTP_HOST', 'ZOHO_SMTP_USER', 'STRIPE_SECRET_KEY', 'BLOB_READ_WRITE_TOKEN']) {
      if (secrets.env[k] && !process.env[k]) process.env[k] = secrets.env[k];
    }
    server.middlewares.use('/api/availability', vercelRoute(availabilityRoute));
    server.middlewares.use('/api/promo-check', vercelRoute(promoCheckRoute));
    server.middlewares.use('/api/organizer-tools', vercelRoute(organizerToolsRoute));
    server.middlewares.use('/api/my-ticket', vercelRoute(myTicketRoute));

    // Mirrors the vercel.json rewrite: the door scanner app lives at /scan.
    server.middlewares.use((req, _res, next) => {
      const match = (req.url || '').match(/^\/scan\/?(\?.*)?$/);
      if (match) req.url = `/scan.html${match[1] || ''}`;
      next();
    });

    server.middlewares.use('/api/create-checkout-session', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      if (!secrets.stripeSecretKey) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set in .env' }));
        return;
      }
      readJsonBody(req).then(async (body) => {
        try {
          const origin = getOrigin(req);
          const result = await createCheckoutSession(secrets.stripeSecretKey, body, origin);
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = err?.status || 400;
          res.end(JSON.stringify({ error: err?.message || 'Unable to start the payment.' }));
        }
      });
    });

    server.middlewares.use('/api/get-checkout-session', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      if (!secrets.stripeSecretKey) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set in .env' }));
        return;
      }
      const sessionId = new URLSearchParams((req.url || '').split('?')[1] || '').get('session_id') || '';
      Promise.resolve()
        .then(() => confirmCheckoutSession(secrets.stripeSecretKey, sessionId, secrets.mail, getOrigin(req), serviceAccountFromEnv(secrets.env)))
        .then((result) => res.end(JSON.stringify(result)))
        .catch((err: any) => {
          res.statusCode = err?.status || 400;
          res.end(JSON.stringify({ error: err?.message || 'Could not verify this payment.' }));
        });
    });

    server.middlewares.use('/api/send-form-email', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      if (!secrets.mail) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'ZOHO_SMTP_PASSWORD is not set in .env' }));
        return;
      }
      readJsonBody(req).then(async (body) => {
        try {
          await sendFormEmail(secrets.mail!, body);
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.statusCode = err instanceof FormEmailError ? err.status : 502;
          res.end(JSON.stringify({ error: err?.message || 'Could not send your message.' }));
        }
      });
    });

    server.middlewares.use('/api/admin-users', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const body = await readJsonBody(req);
        await verifyAdmin(typeof body.idToken === 'string' ? body.idToken : '', 'Only admins can see accounts.');
        const sa = serviceAccountFromEnv(secrets.env);
        res.end(JSON.stringify(sa ? { configured: true, users: await listAuthUsers(sa) } : { configured: false, users: [] }));
      } catch (err: any) {
        res.statusCode = err instanceof HttpError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'Could not load sign-in accounts.' }));
      }
    });

    server.middlewares.use('/api/admin-payments', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const body = await readJsonBody(req);
        await verifyAdmin(typeof body.idToken === 'string' ? body.idToken : '', 'Only admins can see payments.');
        if (!secrets.stripeSecretKey) throw new HttpError('STRIPE_SECRET_KEY is not set in .env', 500);
        res.end(JSON.stringify({ payments: await listCardPayments(secrets.stripeSecretKey) }));
      } catch (err: any) {
        res.statusCode = err instanceof HttpError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'Could not load payments from Stripe.' }));
      }
    });

    server.middlewares.use('/api/admin-security-rules', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const body = await readJsonBody(req);
        await verifyAdmin(typeof body.idToken === 'string' ? body.idToken : '', 'Only admins can manage database security.');
        const sa = serviceAccountFromEnv(secrets.env);
        if (!sa) throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not set in .env', 500);
        res.end(JSON.stringify(body.publish === true ? await publishRules(sa) : await getRulesStatus(sa)));
      } catch (err: any) {
        res.statusCode = err instanceof HttpError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'Could not check the security rules.' }));
      }
    });

    server.middlewares.use('/api/organizer-portal', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const body = await readJsonBody(req);
        const account = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '', 'Please sign in to the organiser portal again.');
        let target = account.uid;
        if (account.isAdmin && typeof body.organizerId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.organizerId)) target = body.organizerId;
        else if (!account.isOrganizer && !account.isAdmin) throw new HttpError('Your organiser account hasn’t been approved yet.', 403);
        res.end(JSON.stringify(await organizerReport(serviceAccountFromEnv(secrets.env), target)));
      } catch (err: any) {
        res.statusCode = err instanceof HttpError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'Could not load your sales right now.' }));
      }
    });

    server.middlewares.use('/api/organizer-notify', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const body = await readJsonBody(req);
        const account = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '');
        if (!secrets.mail) {
          res.end(JSON.stringify({ sent: false }));
          return;
        }
        await sendOrganizerNotice(secrets.mail, serviceAccountFromEnv(secrets.env), account, body);
        res.end(JSON.stringify({ sent: true }));
      } catch (err: any) {
        res.statusCode = err instanceof HttpError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'Could not send the email right now.' }));
      }
    });

    server.middlewares.use('/api/admin-media', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      try {
        const body = await readJsonBody(req);
        const caller = await verifyAccount(typeof body.idToken === 'string' ? body.idToken : '');
        if (!caller.isAdmin && !caller.isOrganizer) throw new HttpError('Only admins and approved organisers can upload images.', 403);
        const owner = caller.isAdmin ? undefined : caller.uid;
        // The Blob SDK reads its token from process.env.
        if (secrets.env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = secrets.env.BLOB_READ_WRITE_TOKEN;
        if (!mediaConfigured(process.env)) {
          res.end(JSON.stringify({ configured: false, items: [] }));
          return;
        }
        if (body.action === 'upload') res.end(JSON.stringify({ configured: true, item: await uploadMedia(body, owner) }));
        else if (body.action === 'delete') {
          await deleteMedia(body.url, owner);
          res.end(JSON.stringify({ configured: true, deleted: true }));
        } else res.end(JSON.stringify({ configured: true, items: await listMedia(owner) }));
      } catch (err: any) {
        res.statusCode = err instanceof HttpError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'Could not reach the media library.' }));
      }
    });

    server.middlewares.use('/api/send-ticket-email', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      const body = await readJsonBody(req);
      if (body.download) {
        try {
          const { bytes, filename } = await ticketPdfForAdmin(body);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.end(Buffer.from(bytes));
        } catch (err: any) {
          res.statusCode = err instanceof TicketEmailError ? err.status : 502;
          res.end(JSON.stringify({ error: err?.message || 'The PDF could not be created.' }));
        }
        return;
      }
      if (!secrets.mail) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'ZOHO_SMTP_PASSWORD is not set in .env' }));
        return;
      }
      try {
        await sendTicketEmail(secrets.mail!, body);
        res.end(JSON.stringify({ ok: true }));
      } catch (err: any) {
        res.statusCode = err instanceof TicketEmailError ? err.status : 502;
        res.end(JSON.stringify({ error: err?.message || 'The email could not be sent.' }));
      }
    });

    server.middlewares.use('/api/easypaisa-order', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      if (!secrets.mail) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'ZOHO_SMTP_PASSWORD is not set in .env' }));
        return;
      }
      readJsonBody(req).then(async (body) => {
        try {
          const result = await submitEasypaisaOrder(secrets.mail!, body);
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = err?.status || 502;
          res.end(JSON.stringify({ error: err?.message || 'Could not submit your payment.' }));
        }
      });
    });

    // Mirrors the vercel.json rewrite: /events/wp-700 → /events/<slug>.
    server.middlewares.use((req, res, next) => {
      const match = (req.url || '').match(/^\/events\/wp-(\d+)\/?(?:\?.*)?$/);
      if (!match) return next();
      fetchWordPressSlug(match[1])
        .then((slug) => {
          res.statusCode = slug ? 308 : 307;
          res.setHeader('Location', slug ? `/events/${encodeURIComponent(slug)}` : '/events');
          res.end();
        })
        .catch(() => {
          res.statusCode = 307;
          res.setHeader('Location', '/events');
          res.end();
        });
    });

    // Mirrors the vercel.json link-preview rewrite: crawlers asking for
    // /events/<slug> get index.html with the event's own share tags.
    server.middlewares.use((req, res, next) => {
      const match = (req.url || '').match(/^\/events\/([^/?#]+)\/?(?:\?.*)?$/);
      if (!match || !SHARE_BOT_UA.test(String(req.headers['user-agent'] || ''))) return next();
      let slug = match[1];
      try {
        slug = decodeURIComponent(slug);
      } catch {
        // keep the raw segment
      }
      renderEventSharePage(slug, getOrigin(req)).then(({ html }) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    });

    server.middlewares.use('/api/wp-events', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      fetchWordPressEvents()
        .then((events) => res.end(JSON.stringify({ events })))
        .catch((err: any) => {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err?.message || 'Could not load events right now.' }));
        });
    });
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      devApi({
        stripeSecretKey: env.STRIPE_SECRET_KEY || '',
        mail: mailConfigFromEnv(env),
        env,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        // The site, plus the door scanner app (scan.html, served at /scan).
        input: {
          main: path.resolve(__dirname, 'index.html'),
          scan: path.resolve(__dirname, 'scan.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
