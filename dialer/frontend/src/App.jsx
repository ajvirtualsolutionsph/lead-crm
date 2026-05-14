import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSignalWire } from './hooks/useSignalWire.js';
import { useLeads } from './hooks/useLeads.js';
import StatusBar from './components/StatusBar.jsx';
import LeadsSidebar from './components/LeadsSidebar.jsx';
import NotesPanel from './components/NotesPanel.jsx';
import Dialer from './components/Dialer.jsx';
import CallLog from './components/CallLog.jsx';
import { T } from './theme.js';

const DISPOSITION_LABELS = {
  'no-answer': 'No Answer — auto-logged',
  'busy':      'Busy — auto-logged',
  'failed':    'Call failed — auto-logged',
  'voicemail': 'Voicemail detected — auto-logged',
};

export default function App() {
  const sw = useSignalWire();
  const { leads, loading, selectedLead, setSelectedLead, fetchLeads, activeSheet, switchSheet, syncLeads } = useLeads();
  const [callLogKey, setCallLogKey] = useState(0);

  // Post-call state (lifted from Dialer)
  const [notes, setNotes] = useState('');
  const skipAutoSaveRef = useRef(false);
  const [outcome, setOutcome] = useState('Answered');
  const [showOutcome, setShowOutcome] = useState(false);
  const [lastDuration, setLastDuration] = useState(0);
  const [dialedNumber, setDialedNumber] = useState('');
  const [autoToast, setAutoToast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLeads('No Reply/Declined'); }, [fetchLeads]);

  // Load existing notes from sheet when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      skipAutoSaveRef.current = true;
      setNotes(selectedLead.dialer_notes || '');
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

  // Show outcome form when call ends naturally (agent hangs up)
  useEffect(() => {
    if (sw.status === 'ready' && lastDuration > 0 && !showOutcome) {
      setShowOutcome(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sw.status]);

  // Handle auto-disposition (no-answer, busy, voicemail, failed)
  useEffect(() => {
    if (!sw.serverDisposition || sw.serverDisposition === 'answered') return;
    setAutoToast(DISPOSITION_LABELS[sw.serverDisposition] || 'Call ended');
    sw.clearDisposition();
    handleCallLogged();
    const t = setTimeout(() => {
      setAutoToast(null);
      if (selectedLead && leads) {
        const idx = leads.findIndex(l => l.rowIndex === selectedLead.rowIndex);
        const next = leads[idx + 1];
        if (next) setSelectedLead(next);
      }
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sw.serverDisposition]);

  // Pre-fill notes from transcript when outcome form opens
  useEffect(() => {
    if (showOutcome && sw.transcript && sw.transcript.length > 0) {
      const body = sw.transcript.map(e => `[${e.time}] You: ${e.text}`).join('\n');
      setNotes(body);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOutcome]);

  function handleCallLogged() {
    setCallLogKey(k => k + 1);
    fetchLeads(activeSheet);
  }

  function handleCallStart(number) {
    setDialedNumber(number);
    setShowOutcome(false);
    setLastDuration(0);
    setAutoToast(null);
  }

  function handleCallEnd(duration) {
    setLastDuration(duration);
  }

  async function handleSaveAndNext() {
    if (saving) return;
    setSaving(true);
    try {
      await axios.post('/calls', {
        leadName: selectedLead?.name || '',
        phone: dialedNumber || selectedLead?.phone || '',
        durationSeconds: lastDuration,
        status: outcome,
        notes,
        rowIndex: selectedLead?.rowIndex,
        sheetName: selectedLead?.sheet,
      });
    } catch (err) {
      console.error('Failed to log call:', err);
    } finally {
      setSaving(false);
    }

    setShowOutcome(false);
    handleCallLogged();

    if (selectedLead && leads) {
      const idx = leads.findIndex(l => l.rowIndex === selectedLead.rowIndex);
      const next = leads[idx + 1];
      if (next) setSelectedLead(next);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: T.appBg }}>
      <StatusBar status={sw.status} />
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
        />

        {/* Column 2: Notes */}
        <NotesPanel
          notes={notes}
          setNotes={setNotes}
          outcome={outcome}
          setOutcome={setOutcome}
          showOutcome={showOutcome}
          saving={saving}
          autoToast={autoToast}
          onSaveAndNext={handleSaveAndNext}
          transcript={sw.transcript}
          interimText={sw.interimText}
          status={sw.status}
        />

        {/* Column 3: Dialpad + Call Log */}
        <div style={{ width: 270, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${T.borderMuted}`, overflowY: 'auto', background: T.appBg }}>
          <div style={{ padding: 16 }}>
            <Dialer
              sw={sw}
              selectedLead={selectedLead}
              onCallStart={handleCallStart}
              onCallEnd={handleCallEnd}
            />
          </div>
          <div style={{ borderTop: `1px solid ${T.borderMuted}` }}>
            <CallLog refreshKey={callLogKey} />
          </div>
        </div>

      </div>
    </div>
  );
}
