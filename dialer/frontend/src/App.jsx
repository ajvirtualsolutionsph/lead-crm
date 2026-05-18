import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLeads } from './hooks/useLeads.js';
import StatusBar from './components/StatusBar.jsx';
import LeadsSidebar from './components/LeadsSidebar.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import CallLog from './components/CallLog.jsx';
import LoginGate, { isAuthenticated } from './components/LoginGate.jsx';
import { T } from './theme.js';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const { leads, loading, selectedLead, setSelectedLead, fetchLeads, activeSheet, switchSheet, syncLeads } = useLeads();
  const [callLogKey, setCallLogKey] = useState(0);

  const [notes, setNotes] = useState('');
  const skipAutoSaveRef = useRef(false);
  const [outcome, setOutcome] = useState('Answered');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLeads('Ready for Call'); }, [fetchLeads]);

  function handleLogout() {
    sessionStorage.removeItem('crm_authed');
    setAuthed(false);
  }

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

  async function handleSaveNotes() {
    if (!selectedLead?.rowIndex) return;
    await axios.patch(`/leads/${selectedLead.rowIndex}/notes`, {
      notes,
      sheet: selectedLead.sheet,
    }).catch(err => console.error('Notes save failed:', err));
  }

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: T.appBg }}>
      <StatusBar onLogout={handleLogout} />
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
          onSaveNotes={handleSaveNotes}
        />

        {/* Column 3: Call Log */}
        <CallLog
          outcome={outcome}
          setOutcome={setOutcome}
          saving={saving}
          onSave={handleSaveAndNext}
          onMoveToSecond={async (lead) => {
            await axios.post(`/leads/${lead.rowIndex}/move-to-second`, { sheet: lead.sheet });
            fetchLeads(activeSheet);
            setSelectedLead(null);
          }}
          onMoveToRejects={async (lead) => {
            try {
              await axios.post('/calls', {
                leadName: lead.name,
                phone: lead.phone,
                durationSeconds: 0,
                status: outcome,
                notes,
                rowIndex: lead.rowIndex,
                sheetName: lead.sheet,
              });
            } catch (err) {
              console.error('Failed to log call on reject:', err);
            }
            await axios.post(`/leads/${lead.rowIndex}/move-to-rejects`, { sheet: lead.sheet });
            setCallLogKey(k => k + 1);
            fetchLeads(activeSheet);
            const idx = leads.findIndex(l => l.rowIndex === lead.rowIndex);
            const next = leads[idx + 1];
            if (next) setSelectedLead(next);
            else setSelectedLead(null);
          }}
          selectedLead={selectedLead}
          refreshKey={callLogKey}
          activeSheet={activeSheet}
        />

      </div>
    </div>
  );
}
