import { useEffect, useState } from 'react';
import { useSignalWire } from './hooks/useSignalWire.js';
import { useLeads } from './hooks/useLeads.js';
import StatusBar from './components/StatusBar.jsx';
import LeadsSidebar from './components/LeadsSidebar.jsx';
import Dialer from './components/Dialer.jsx';
import CallLog from './components/CallLog.jsx';
import { T } from './theme.js';

export default function App() {
  const sw = useSignalWire();
  const { leads, loading, selectedLead, setSelectedLead, fetchLeads, updateLead, activeSheet, switchSheet } = useLeads();
  const [callLogKey, setCallLogKey] = useState(0);

  useEffect(() => { fetchLeads('No Reply/Declined'); }, [fetchLeads]);

  function handleCallLogged() {
    setCallLogKey(k => k + 1);
    fetchLeads(activeSheet);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: T.appBg }}>
      <StatusBar status={sw.status} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeadsSidebar
          leads={leads}
          loading={loading}
          selectedLead={selectedLead}
          onSelect={setSelectedLead}
          onRefresh={fetchLeads}
          activeSheet={activeSheet}
          onSwitchSheet={switchSheet}
        />
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: T.appBg }}>
          <Dialer
            sw={sw}
            selectedLead={selectedLead}
            onCallLogged={handleCallLogged}
            leads={leads}
            setSelectedLead={setSelectedLead}
            transcript={sw.transcript}
            interimText={sw.interimText}
          />
          <CallLog refreshKey={callLogKey} />
        </div>
      </div>
    </div>
  );
}
