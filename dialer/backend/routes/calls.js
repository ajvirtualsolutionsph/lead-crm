import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { updateLead } from '../lib/sheets.js';

const router = Router();

let callState = {
  confName: null,
  leadCallSid: null,
  leadPhone: null,
  leadName: null,
  rowIndex: null,
  sheetName: null,
  disposition: null,  // null | 'no-answer' | 'busy' | 'failed' | 'voicemail' | 'answered'
  startedAt: null,
};

function swFetch(path, method, body, contentType = 'application/json') {
  const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL } = process.env;
  const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');
  return fetch(`https://${SIGNALWIRE_SPACE_URL}${path}`, {
    method,
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': contentType },
    body: contentType === 'application/json' ? JSON.stringify(body) : body.toString(),
  });
}

async function restCall(to, from, twiml, extra = {}) {
  const { SIGNALWIRE_PROJECT_ID } = process.env;
  const params = new URLSearchParams({ To: to.replace(/\s+/g, ''), From: from, Twiml: twiml, ...extra });
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

async function autoHangup(callSid) {
  try {
    const { SIGNALWIRE_PROJECT_ID } = process.env;
    await swFetch(
      `/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls/${callSid}.json`,
      'POST', new URLSearchParams({ Status: 'completed' }), 'application/x-www-form-urlencoded'
    );
    console.log(`[autoHangup] Terminated call ${callSid}`);
  } catch (err) {
    console.error('[autoHangup] Error:', err.message);
  }
}

async function autoLog(status, notes) {
  const { leadName, leadPhone, rowIndex, sheetName, startedAt } = callState;
  const durationSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  try {
    const { error } = await supabase
      .from('calls')
      .insert({ lead_name: leadName, phone: leadPhone, duration_seconds: durationSeconds, status, notes });
    if (error) console.error('[autoLog] Supabase error:', error);
  } catch (err) {
    console.error('[autoLog] Supabase insert failed:', err.message);
  }
  if (rowIndex) {
    updateLead(rowIndex, status, notes, sheetName).catch(err =>
      console.error('[autoLog] Sheet update failed (non-fatal):', err.message)
    );
  }
}

function clearCallState() {
  callState = {
    confName: null, leadCallSid: null, leadPhone: null,
    leadName: null, rowIndex: null, sheetName: null,
    disposition: null, startedAt: null,
  };
}

// Agent calls this SignalWire number to join the active conference
router.post('/inbound', (req, res) => {
  res.type('text/xml');
  if (!callState.confName) {
    res.send('<Response><Say>There is no active call waiting. Goodbye.</Say></Response>');
    return;
  }
  res.send(`<Response><Dial><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true">${callState.confName}</Conference></Dial></Response>`);
});

router.post('/initiate', async (req, res) => {
  try {
    const { to, leadName, rowIndex, sheetName } = req.body;
    const { SIGNALWIRE_PHONE_NUMBER } = process.env;
    const confName = `dialer-${Date.now()}`;

    const leadTwiml = `<Response><Dial><Conference beep="false" startConferenceOnEnter="false" endConferenceOnExit="true">${confName}</Conference></Dial></Response>`;

    const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
    const extra = { Timeout: '25' };
    if (backendUrl) {
      extra.StatusCallback = `${backendUrl}/calls/status-callback`;
      extra.StatusCallbackMethod = 'POST';
      extra.MachineDetection = 'Enable';
    } else {
      console.warn('[initiate] No RENDER_EXTERNAL_URL or BACKEND_URL set — StatusCallback and AMD disabled');
    }

    const leadCall = await restCall(to, SIGNALWIRE_PHONE_NUMBER, leadTwiml, extra);
    console.log('Lead call initiated:', leadCall.sid);

    callState = {
      confName,
      leadCallSid: leadCall.sid,
      leadPhone: to,
      leadName: leadName || '',
      rowIndex: rowIndex || null,
      sheetName: sheetName || 'No Reply/Declined',
      disposition: null,
      startedAt: Date.now(),
    };

    res.json({ leadCallSid: leadCall.sid, confName });
  } catch (err) {
    console.error('Initiate error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initiate call' });
  }
});

// SignalWire posts here when call status changes (no-answer, busy, AMD, etc.)
router.post('/status-callback', async (req, res) => {
  res.sendStatus(204);  // respond immediately — SignalWire expects a fast response

  const { CallSid, CallStatus, AnsweredBy } = req.body;

  if (!callState.leadCallSid || CallSid !== callState.leadCallSid) return;

  console.log(`[StatusCallback] SID=${CallSid} Status=${CallStatus} AnsweredBy=${AnsweredBy}`);

  if (AnsweredBy === 'machine_start' || AnsweredBy === 'machine_end_silence' || AnsweredBy === 'machine_end_other') {
    callState.disposition = 'voicemail';
    await autoHangup(CallSid);
    await autoLog('Voicemail', 'AMD: voicemail detected — auto-hung up');
    clearCallState();
    return;
  }

  if (CallStatus === 'no-answer') {
    callState.disposition = 'no-answer';
    await autoLog('No Answer', 'Ring timeout — no answer');
    clearCallState();
    return;
  }

  if (CallStatus === 'busy') {
    callState.disposition = 'busy';
    await autoLog('Busy', 'Lead line was busy');
    clearCallState();
    return;
  }

  if (CallStatus === 'failed' || CallStatus === 'canceled') {
    callState.disposition = 'failed';
    await autoLog('Failed', `Call ${CallStatus}`);
    clearCallState();
    return;
  }

  if (CallStatus === 'in-progress' && (!AnsweredBy || AnsweredBy === 'human' || AnsweredBy === 'unknown')) {
    callState.disposition = 'answered';
    return;
  }

  if (CallStatus === 'completed') {
    clearCallState();
  }
});

// Frontend polls this while in-call to detect auto-terminated calls
router.get('/status', (req, res) => {
  res.json({
    active: callState.confName !== null,
    disposition: callState.disposition,
    elapsedSeconds: callState.startedAt ? Math.floor((Date.now() - callState.startedAt) / 1000) : 0,
  });
});

router.post('/hangup', async (req, res) => {
  try {
    const { callSid } = req.body;
    const sidToHang = callSid || callState.leadCallSid;
    clearCallState();
    if (!sidToHang) return res.json({ ok: true });
    const { SIGNALWIRE_PROJECT_ID } = process.env;
    await swFetch(
      `/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls/${sidToHang}.json`,
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
