import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { updateLead } from '../lib/sheets.js';

const router = Router();

// Active conference state — single-agent dialer, one call at a time
let activeConference = null;

function swFetch(path, method, body, contentType = 'application/json') {
  const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL } = process.env;
  const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');
  return fetch(`https://${SIGNALWIRE_SPACE_URL}${path}`, {
    method,
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': contentType },
    body: contentType === 'application/json' ? JSON.stringify(body) : body.toString(),
  });
}

async function restCall(to, from, twiml) {
  const { SIGNALWIRE_PROJECT_ID } = process.env;
  const params = new URLSearchParams({ To: to.replace(/\s+/g, ''), From: from, Twiml: twiml });
  const r = await swFetch(
    `/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls.json`,
    'POST', params, 'application/x-www-form-urlencoded'
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Call to ${to} failed: ${r.status} ${t}`);
  }
  return r.json();
}

// Agent calls this SignalWire number to join the active conference
router.post('/inbound', (req, res) => {
  res.type('text/xml');
  if (!activeConference) {
    res.send('<Response><Say>There is no active call waiting. Goodbye.</Say></Response>');
    return;
  }
  res.send(`<Response><Dial><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true">${activeConference}</Conference></Dial></Response>`);
});

router.post('/initiate', async (req, res) => {
  try {
    const { to } = req.body;
    const { SIGNALWIRE_PHONE_NUMBER } = process.env;
    const confName = `dialer-${Date.now()}`;

    // Lead waits in conference with hold music until agent calls in
    const leadTwiml = `<Response><Dial><Conference beep="false" startConferenceOnEnter="false" endConferenceOnExit="true">${confName}</Conference></Dial></Response>`;

    const leadCall = await restCall(to, SIGNALWIRE_PHONE_NUMBER, leadTwiml);
    console.log('Lead call initiated:', leadCall.sid);

    activeConference = confName;

    res.json({ leadCallSid: leadCall.sid, confName });
  } catch (err) {
    console.error('Initiate error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initiate call' });
  }
});

router.post('/hangup', async (req, res) => {
  try {
    const { callSid } = req.body;
    activeConference = null;
    if (!callSid) return res.json({ ok: true });
    const { SIGNALWIRE_PROJECT_ID } = process.env;
    await swFetch(
      `/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls/${callSid}.json`,
      'POST', new URLSearchParams({ Status: 'completed' }), 'application/x-www-form-urlencoded'
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Hangup error:', err);
    res.status(500).json({ error: 'Failed to hang up' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .order('called_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Calls fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { leadName, phone, durationSeconds, status, notes, rowIndex, sheetName } = req.body;
    const { data, error } = await supabase
      .from('calls')
      .insert({ lead_name: leadName, phone, duration_seconds: durationSeconds, status, notes })
      .select()
      .single();
    if (error) throw error;
    if (rowIndex) {
      await updateLead(rowIndex, status, notes, sheetName).catch(err =>
        console.error('Sheet update error (non-fatal):', err)
      );
    }
    res.json(data);
  } catch (err) {
    console.error('Call log error:', err);
    res.status(500).json({ error: 'Failed to log call' });
  }
});

export default router;
