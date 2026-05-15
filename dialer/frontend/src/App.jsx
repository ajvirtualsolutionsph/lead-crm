import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLeads } from './hooks/useLeads.js';
import StatusBar from './components/StatusBar.jsx';
import LeadsSidebar from './components/LeadsSidebar.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import CallLog from './components/CallLog.jsx';
import { T } from './theme.js';

export default function App() {
  const { leads, loading, selectedLead, setSelectedLead, fetchLeads, activeSheet, switchSheet, syncLeads } = useLeads();
  const [callLogKey, setCallLogKey] = useState(0);

  const [notes, setNotes] = useState('');
  const skipAutoSaveRef = useRef(false);
  const [outcome, setOutcome] = useState('Answered');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLeads('Ready for Call'); }, [fetchLeads]);

  // Load notes + reset outcome when lead changes
  useEffect(() => {
    if (selectedLead) {
      skipAutoSaveRef.current = true;
      setNotes(selectedLead.dialer_notes || '');
      setOutcome('Answered');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?.rowIndex, selectedLead?.sheet]);

  // Debounced auto-save notes to Google Sheets (col X only)
  useEffect(() => {
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    if (!selectedLead?.rowIndex) return;
    const timer = setTimeout(() => {
      axios.patch(`/leads/${selectedLead.rowIndex}/notes`, {
        notes,
        sheet: selectedLead.sheet,
      }).catch(err => console.error('Notes auto-save failed:', err));
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  async function handleSaveAndNext() {
    if (saving || !selectedLead) return;
    setSaving(true);
    try {
      await axios.post('/calls', {
        leadName: selectedLead.name,
        phone: selectedLead.phone,
        durationSeconds: 0,
        status: outcome,
        notes,
        rowIndex: selectedLead.rowIndex,
        sheetName: selectedLead.sheet,
      });
    } catch (err) {
      console.error('Failed to log call:', err);
    } finally {
      setSaving(false);
    }

    setCallLogKey(k => k + 1);
    fetchLeads(activeSheet);

    const idx = leads.findIndex(l => l.rowIndex === selectedLead.rowIndex);
    const next = leads[idx + 1];
    if (next) setSelectedLead(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: T.appBg }}>
      <StatusBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Column 1: Leads list */}
        <LeadsSidebar
          leads={leads}
          loading={loading}
          selectedLead={selectedLead}
          onSelect={setSelectedLead}
          onRefresh={fetchLeads}
          activeSheet={activeSheet}
          onSwitchSheet={switchSheet}
          onSync={async () => {
            const result = await syncLeads();
            fetchLeads(activeSheet);
            return result;
          }}
          onArchive={async () => {
            const result = await axios.post('/leads/archive-no-answer');
            fetchLeads(activeSheet);
            return result.data;
          }}
        />

        {/* Column 2: Notes + Lead Details */}
        <NotesPanel
          notes={notes}
          setNotes={setNotes}
          selectedLead={selectedLead}
        />

        {/* Column 3: Call Log */}
        <CallLog
          outcome={outcome}
          setOutcome={setOutcome}
          saving={saving}
          onSave={handleSaveAndNext}
          selectedLead={selectedLead}
          refreshKey={callLogKey}
        />

      </div>
    </div>
  );
}
