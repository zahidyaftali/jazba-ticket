import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {createTicketPaymentIntent} from './api/_lib/stripePayment';

// Serves /api/create-payment-intent during `npm run dev` with the same logic
// Vercel runs in production, so Stripe checkout works locally too.
const stripeDevApi = (secretKey: string): Plugin => ({
  name: 'stripe-dev-api',
  configureServer(server) {
    server.middlewares.use('/api/create-payment-intent', (req, res) => {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', async () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        if (!secretKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set in .env' }));
          return;
        }
        try {
          const result = await createTicketPaymentIntent(secretKey, JSON.parse(raw || '{}'));
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err?.message || 'Unable to start the payment.' }));
        }
      });
    });
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), stripeDevApi(env.STRIPE_SECRET_KEY || '')],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
