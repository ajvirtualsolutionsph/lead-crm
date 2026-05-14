import { useState, useCallback } from 'react';
import axios from 'axios';

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeSheet, setActiveSheet] = useState('Ready for Call');

  const fetchLeads = useCallback(async (sheet) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/leads', { params: { sheet } });
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchSheet = useCallback((sheet) => {
    setActiveSheet(sheet);
    setSelectedLead(null);
    fetchLeads(sheet);
  }, [fetchLeads]);

  const updateLead = useCallback(async (rowIndex, status, notes, sheet) => {
    try {
      await axios.patch(`/leads/${rowIndex}`, { status, notes, sheet });
      setLeads(prev =>
        prev.map(l => (l.rowIndex === rowIndex ? { ...l, status, notes } : l))
      );
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, []);

  const syncLeads = useCallback(async () => {
    const { data } = await axios.post('/leads/sync');
    return data; // { added: N }
  }, []);

  return { leads, loading, selectedLead, setSelectedLead, fetchLeads, updateLead, activeSheet, switchSheet, syncLeads };
}
