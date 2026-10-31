import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {createCheckoutSession, getOrigin} from './api/_lib/stripePayment';
import {confirmCheckoutSession} from './api/_lib/orderConfirmation';
import {sendFormEmail, FormEmailError} from './api/_lib/formEmail';
import {submitEasypaisaOrder} from './api/_lib/easypaisaOrder';
import {sendTicketEmail, ticketPdfForAdmin, TicketEmailError} from './api/_lib/ticketEmail';
import {HttpError, verifyAdmin} from './api/_lib/adminAuth';
import {listAuthUsers, serviceAccountFromEnv} from './api/_lib/firebaseAuthUsers';
import {listCardPayments} from './api/_lib/stripeLedger';
import {mailConfigFromEnv, type MailConfig} from './api/_lib/sendEmail';
import {fetchWordPressEvents, fetchWordPressSlug} from './api/_lib/wordpressEvents';
import {SHARE_BOT_UA, renderEventSharePage} from './api/_lib/eventShare';

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
      confirmCheckoutSession(secrets.stripeSecretKey, sessionId, secrets.mail, getOrigin(req))
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
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
