import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// express-rate-limit is used in routes/calls.js — imported there directly

import tokenRoute from './routes/token.js';
import leadsRoute from './routes/leads.js';
import callsRoute from './routes/calls.js';
import { initDialerColumns, syncFromLeadGen } from './lib/sheets.js';

// Fail fast if required env vars are missing
const REQUIRED_ENV = [
  'SIGNALWIRE_PROJECT_ID', 'SIGNALWIRE_API_TOKEN', 'SIGNALWIRE_SPACE_URL', 'SIGNALWIRE_PHONE_NUMBER',
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
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Auth middleware — exempts SignalWire webhooks and /health
const WEBHOOK_PATHS = ['/calls/inbound', '/calls/status-callback'];

function requireAuth(req, res, next) {
  const secret = process.env.API_SECRET;
  if (!secret) return next(); // dev mode: no secret set → skip
  if (WEBHOOK_PATHS.includes(req.path)) return next(); // SignalWire webhooks can't send custom headers
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
  setupInboundWebhook();
  initDialerColumns().catch(err => console.error('Sheet init failed (non-fatal):', err.message));
  if (process.env.LEAD_GEN_SHEET_ID) {
    setInterval(() => {
      syncFromLeadGen()
        .then(r => { if (r.added > 0) console.log(`[auto-sync] ${r.added} new leads added`); })
        .catch(err => console.error('[auto-sync] failed:', err.message));
    }, 30 * 60 * 1000);
    console.log('[auto-sync] Scheduled every 30 min from Lead Gen Pipeline');
  }
});

async function setupInboundWebhook() {
  const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER } = process.env;

  const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (!backendUrl) {
    console.log('No BACKEND_URL set — skipping inbound webhook setup (fine for local dev)');
    return;
  }

  const inboundUrl = `${backendUrl}/calls/inbound`;
  const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');
  const headers = { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' };
  const base = `https://${SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}`;

  try {
    const r = await fetch(`${base}/IncomingPhoneNumbers.json`, { headers });
    const data = await r.json();
    const number = data.incoming_phone_numbers?.find(n => n.phone_number === SIGNALWIRE_PHONE_NUMBER);
    if (!number) { console.log('Phone number not found — webhook not set'); return; }

    await fetch(`${base}/IncomingPhoneNumbers/${number.sid}.json`, {
      method: 'POST', headers,
      body: new URLSearchParams({ VoiceUrl: inboundUrl }).toString(),
    });
    console.log(`Inbound webhook set: ${inboundUrl}`);
  } catch (err) {
    console.error('Webhook setup failed (non-fatal):', err.message);
  }
}
