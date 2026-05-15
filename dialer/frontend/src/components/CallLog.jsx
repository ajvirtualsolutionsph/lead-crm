import { useState, useEffect } from 'react';
import axios from 'axios';
import { T } from '../theme.js';

const OUTCOMES = ['Answered', 'No Answer', 'Voicemail', 'Busy', 'Callback Requested', 'Not Interested'];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CallLog({ outcome, setOutcome, saving, onSave, selectedLead, refreshKey }) {
  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    axios.get('/calls')
      .then(r => setRecentCalls(r.data))
      .catch(() => {});
  }, [refreshKey]);

  return (
    <div style={{ width: 270, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${T.borderMuted}`, background: T.appBg }}>

      {/* Log a call section */}
      <div style={{ padding: 14, borderBottom: `1px solid ${T.borderMuted}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
          Log a Call
        </div>

        {!selectedLead ? (
          <div style={{ color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>Select a lead to log a call</div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedLead.name}
            </div>
            <div style={{ fontSize: 12, color: '#38bdf8', marginBottom: 12, fontFamily: 'monospace' }}>
              {selectedLead.phone}
            </div>

            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outcome</div>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 8px',
                marginBottom: 10,
                borderRadius: 4,
                border: `1px solid ${T.borderStrong}`,
                background: T.inputBg,
                color: T.textPrimary,
                fontSize: 13,
              }}
            >
              {OUTCOMES.map(o => <option key={o}>{o}</option>)}
            </select>

            <button
              onClick={onSave}
              disabled={saving}
              style={{
                width: '100%',
                padding: 10,
                background: T.saveBlue,
                color: T.textInverted,
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save & Next Lead'}
            </button>
          </>
        )}
      </div>

      {/* Recent calls */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
          Recent Calls
        </div>
        {recentCalls.length === 0 ? (
          <div style={{ color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>No calls logged yet</div>
        ) : (
          recentCalls.map(call => (
            <div key={call.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${T.borderMuted}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {call.lead_name || call.phone}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>{call.status}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{formatDate(call.called_at)}</span>
              </div>
              {call.notes && (
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                  {call.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
