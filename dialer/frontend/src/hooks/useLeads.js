import { useState, useCallback } from 'react';
import axios from 'axios';

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/leads');
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLead = useCallback(async (rowIndex, status, notes) => {
    try {
      await axios.patch(`/api/leads/${rowIndex}`, { status, notes });
      setLeads(prev =>
        prev.map(l => (l.rowIndex === rowIndex ? { ...l, status, notes } : l))
      );
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, []);

  return { leads, loading, selectedLead, setSelectedLead, fetchLeads, updateLead };
}
