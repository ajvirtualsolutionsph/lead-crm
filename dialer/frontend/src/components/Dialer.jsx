import { useState, useEffect } from 'react';
import { T } from '../theme.js';

const KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];
const AGENT_NUMBER = import.meta.env.VITE_SIGNALWIRE_FROM_NUMBER || '+12525303318';

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Dialer({ sw, selectedLead, onCallStart, onCallEnd }) {
  const { status, callDuration, makeCall, hangUp } = sw;
  const [number, setNumber] = useState('');

  useEffect(() => {
    if (selectedLead) setNumber(selectedLead.phone);
  }, [selectedLead]);

  function handleCall() {
    onCallStart(number);
    makeCall(number, {
      leadName: selectedLead?.name || '',
      rowIndex: selectedLead?.rowIndex || null,
      sheetName: selectedLead?.sheet || 'No Reply/Declined',
    });
  }

  function handleHangUp() {
    onCallEnd(callDuration);
    hangUp();
  }

  const isActive = status === 'in-call' || status === 'ringing' || status === 'connecting';
  const isReady = status === 'ready';

  return (
    <div style={{ padding: 16, background: T.panelBg, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, color: T.textPrimary }}>Dialer</h2>

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={e => setNumber(e.target.value)}
        placeholder="+1XXXXXXXXXX"
        disabled={isActive}
        style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: `1px solid ${T.borderStrong}`, borderRadius: 6, marginBottom: 10, boxSizing: 'border-box', background: T.inputBg, color: T.textPrimary }}
      />

      {/* Dial pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 10 }}>
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => setNumber(n => n + k)}
            disabled={isActive}
            style={{ padding: '7px 0', fontSize: 13, borderRadius: 6, border: `1px solid ${T.borderStrong}`, background: T.dialpadBg, cursor: 'pointer', color: T.textPrimary }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Call controls */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!isActive && (
          <button
            onClick={handleCall}
            disabled={!number || !isReady}
            style={{ flex: 1, padding: 12, background: T.callGreen, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 15, cursor: !number || !isReady ? 'not-allowed' : 'pointer', opacity: !number || !isReady ? 0.6 : 1 }}
          >
            Call
          </button>
        )}
        {isActive && (
          <button
            onClick={handleHangUp}
            style={{ flex: 1, padding: 12, background: T.hangupRed, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 15, cursor: 'pointer' }}
          >
            Hang Up
          </button>
        )}
      </div>

      {/* Join-call banner */}
      {isActive && (
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          background: '#1e3a5f',
          border: '1px solid #38bdf8',
          borderRadius: 6,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            To join the call, dial from your phone:
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8', letterSpacing: 2 }}>
            {AGENT_NUMBER}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
            The lead is on hold until you call in
          </div>
        </div>
      )}

      {/* Live timer */}
      {status === 'in-call' && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 20, fontVariantNumeric: 'tabular-nums', color: T.statusInCall }}>
          {formatDuration(callDuration)}
        </div>
      )}
    </div>
  );
}
