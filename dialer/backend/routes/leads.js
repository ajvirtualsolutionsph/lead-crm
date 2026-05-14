import { Router } from 'express';
import { getLeads, updateLead, updateDialerNotes, SHEET_TABS } from '../lib/sheets.js';

const router = Router();

router.get('/tabs', (_req, res) => res.json(SHEET_TABS));

router.get('/', async (req, res) => {
  try {
    const sheet = req.query.sheet || 'No Reply/Declined';
    const leads = await getLeads(sheet);
    res.json(leads);
  } catch (err) {
    console.error('Leads fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.patch('/:rowIndex', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    const { status, notes, sheet } = req.body;
    await updateLead(rowIndex, status, notes, sheet);
    res.json({ success: true });
  } catch (err) {
    console.error('Lead update error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Auto-save notes only (col X) — does not touch status or last_called
router.patch('/:rowIndex/notes', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    const { notes, sheet } = req.body;
    await updateDialerNotes(rowIndex, notes ?? '', sheet);
    res.json({ success: true });
  } catch (err) {
    console.error('Notes auto-save error:', err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

export default router;
