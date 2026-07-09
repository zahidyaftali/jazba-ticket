// Local development API server. Vite proxies /api/* here (see vite.config.ts).
// Run alongside `npm run dev`:  npm run dev:api
import 'dotenv/config';
import app from '../api/_lib/app';

const port = Number(process.env.API_PORT || 8787);
app.listen(port, () => {
  console.log(`Jazbatickets API running on http://localhost:${port}`);
});
