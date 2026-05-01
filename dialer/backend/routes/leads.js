import { Router } from 'express';
import { getLeads, updateLead } from '../lib/sheets.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const leads = await getLeads();
    res.json(leads);
  } catch (err) {
    console.error('Leads fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.patch('/:rowIndex', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    const { status, notes } = req.body;
    await updateLead(rowIndex, status, notes);
    res.json({ success: true });
  } catch (err) {
    console.error('Lead update error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

export default router;
