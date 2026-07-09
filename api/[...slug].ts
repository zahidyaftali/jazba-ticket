// Vercel catch-all: every /api/* request is served by the single Express app.
// (One serverless function total — stays well inside the Hobby plan limits.)
import app from './_lib/app';

export default app;
