import { Router } from 'express';
import { getLeads, updateLead, updateDialerNotes, updateLeadField, syncFromLeadGen, archiveNoAnswer, SHEET_TABS } from '../lib/sheets.js';

const router = Router();

router.get('/tabs', (_req, res) => res.json(SHEET_TABS));

router.post('/sync', async (_req, res) => {
  try {
    const result = await syncFromLeadGen();
    res.json(result);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.post('/archive-no-answer', async (_req, res) => {
  try {
    const result = await archiveNoAnswer();
    res.json(result);
  } catch (err) {
    console.error('Archive error:', err);
    res.status(500).json({ error: err.message || 'Archive failed' });
  }
});

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

// Update any editable lead field (cols A–H) — used by the CRM detail form
router.patch('/:rowIndex/info', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    const { field, value, sheet } = req.body;
    await updateLeadField(rowIndex, field, value, sheet);
    res.json({ success: true });
  } catch (err) {
    console.error('Lead field update error:', err);
    res.status(400).json({ error: err.message || 'Failed to update field' });
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
