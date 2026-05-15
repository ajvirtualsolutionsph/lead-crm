import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { updateLead } from '../lib/sheets.js';

const router = Router();

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
