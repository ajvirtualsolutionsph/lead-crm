import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { updateLead } from '../lib/sheets.js';

const router = Router();

router.post('/initiate', async (req, res) => {
  try {
    const { to } = req.body;
    const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER } = process.env;
    const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');

    const toNormalized = to.replace(/\s+/g, '');
    const twiml = '<Response><Pause length="60"/></Response>';
    const params = new URLSearchParams({ To: toNormalized, From: SIGNALWIRE_PHONE_NUMBER, Twiml: twiml });

    const response = await fetch(
      `https://${SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Call initiate error:', response.status, text);
      return res.status(500).json({ error: 'Failed to initiate call' });
    }

    const data = await response.json();
    console.log('Call initiated:', data.sid, data.status);
    res.json({ callSid: data.sid, status: data.status });
  } catch (err) {
    console.error('Call initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

router.post('/hangup', async (req, res) => {
  try {
    const { callSid } = req.body;
    if (!callSid) return res.json({ ok: true });

    const { SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL } = process.env;
    const credentials = Buffer.from(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`).toString('base64');

    await fetch(
      `https://${SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls/${callSid}.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ Status: 'completed' }).toString(),
      }
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
    const { leadName, phone, durationSeconds, status, notes, rowIndex } = req.body;

    const { data, error } = await supabase
      .from('calls')
      .insert({ lead_name: leadName, phone, duration_seconds: durationSeconds, status, notes })
      .select()
      .single();

    if (error) throw error;

    // Update the Google Sheet row if rowIndex is provided
    if (rowIndex) {
      await updateLead(rowIndex, status, notes).catch(err =>
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
