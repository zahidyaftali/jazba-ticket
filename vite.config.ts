import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {createCheckoutSession, getCheckoutSession, getOrigin} from './api/_lib/stripePayment';
import {sendFormEmail, FormEmailError} from './api/_lib/formEmail';

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
const devApi = (secrets: { stripeSecretKey: string; resendApiKey: string }): Plugin => ({
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
      getCheckoutSession(secrets.stripeSecretKey, sessionId)
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
      if (!secrets.resendApiKey) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'RESEND_API_KEY is not set in .env' }));
        return;
      }
      readJsonBody(req).then(async (body) => {
        try {
          await sendFormEmail(secrets.resendApiKey, body);
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.statusCode = err instanceof FormEmailError ? err.status : 502;
          res.end(JSON.stringify({ error: err?.message || 'Could not send your message.' }));
        }
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
        resendApiKey: env.RESEND_API_KEY || '',
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
