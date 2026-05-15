import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import tokenRoute from './routes/token.js';
import leadsRoute from './routes/leads.js';
import callsRoute from './routes/calls.js';
import { syncFromLeadGen } from './lib/sheets.js';

// Fail fast if required env vars are missing
const REQUIRED_ENV = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) { console.error(`Missing required env var: ${key}`); process.exit(1); }
}

if (!process.env.API_SECRET) {
  console.warn('[auth] API_SECRET not set — all endpoints are unprotected. Set API_SECRET in .env.');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim())
  .concat(['http://localhost:5174']);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const WEBHOOK_PATHS = [];

function requireAuth(req, res, next) {
  const secret = process.env.API_SECRET;
  if (!secret) return next();
  if (WEBHOOK_PATHS.includes(req.path)) return next();
  const key = req.headers['x-api-key'];
  if (!key || key !== secret) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(requireAuth);

app.use('/token', tokenRoute);
app.use('/leads', leadsRoute);
app.use('/calls', callsRoute);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  if (process.env.LEAD_GEN_SHEET_ID) {
    setInterval(() => {
      syncFromLeadGen()
        .then(r => { if (r.added > 0) console.log(`[auto-sync] ${r.added} new leads added`); })
        .catch(err => console.error('[auto-sync] failed:', err.message));
    }, 30 * 60 * 1000);
    console.log('[auto-sync] Scheduled every 30 min from Lead Gen Pipeline');
  }
});
