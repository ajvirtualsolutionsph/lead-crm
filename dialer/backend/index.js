import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import tokenRoute from './routes/token.js';
import leadsRoute from './routes/leads.js';
import callsRoute from './routes/calls.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/token', tokenRoute);
app.use('/leads', leadsRoute);
app.use('/calls', callsRoute);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  setupInboundWebhook();
});

async function setupInboundWebhook() {
  const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER } = process.env;
  if (!SIGNALWIRE_PROJECT_ID || !SIGNALWIRE_API_TOKEN || !SIGNALWIRE_SPACE_URL || !SIGNALWIRE_PHONE_NUMBER) return;

  // Render sets RENDER_EXTERNAL_URL automatically; fall back to BACKEND_URL for local testing
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
