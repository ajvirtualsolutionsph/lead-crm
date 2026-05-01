import { useState, useEffect } from 'react';
import axios from 'axios';

const KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Dialer({ sw, selectedLead, onCallLogged, leads, setSelectedLead }) {
  const { status, callDuration, isMuted, makeCall, hangUp, toggleMute } = sw;
  const [number, setNumber] = useState('');
  const [outcome, setOutcome] = useState('Answered');
  const [notes, setNotes] = useState('');
  const [showOutcome, setShowOutcome] = useState(false);
  const [lastDuration, setLastDuration] = useState(0);

  useEffect(() => {
    if (selectedLead) setNumber(selectedLead.phone);
  }, [selectedLead]);

  useEffect(() => {
    if (status === 'idle' && lastDuration > 0) {
      setShowOutcome(true);
    }
  }, [status]);

  function handleCall() {
    setShowOutcome(false);
    setLastDuration(0);
    makeCall(number);
  }

  function handleHangUp() {
    setLastDuration(callDuration);
    hangUp();
  }

  async function handleSaveAndNext() {
    try {
      await axios.post('/api/calls', {
        leadName: selectedLead?.name || '',
        phone: number,
        durationSeconds: lastDuration,
        status: outcome,
        notes,
        rowIndex: selectedLead?.rowIndex,
      });
    } catch (err) {
      console.error('Failed to log call:', err);
    }

    setShowOutcome(false);
    setNotes('');
    onCallLogged();

    // Advance to next lead
    if (selectedLead && leads) {
      const idx = leads.findIndex(l => l.rowIndex === selectedLead.rowIndex);
      const next = leads[idx + 1];
      if (next) setSelectedLead(next);
    }
  }

  const isActive = status === 'in-call' || status === 'ringing' || status === 'connecting';

  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Dialer</h2>

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={e => setNumber(e.target.value)}
        placeholder="+1XXXXXXXXXX"
        disabled={isActive}
        style={{ width: '100%', padding: '10px 12px', fontSize: 18, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12, boxSizing: 'border-box' }}
      />

      {/* Dial pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => setNumber(n => n + k)}
            disabled={isActive}
            style={{ padding: '14px 0', fontSize: 18, borderRadius: 6, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}
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
            disabled={!number}
            style={{ flex: 1, padding: 14, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' }}
          >
            Call
          </button>
        )}
        {isActive && (
          <>
            <button
              onClick={handleHangUp}
              style={{ flex: 1, padding: 14, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' }}
            >
              Hang Up
            </button>
            <button
              onClick={toggleMute}
              style={{ padding: '14px 18px', background: isMuted ? '#6b7280' : '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </>
        )}
      </div>

      {/* Live timer */}
      {status === 'in-call' && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 22, fontVariantNumeric: 'tabular-nums', color: '#10b981' }}>
          {formatDuration(callDuration)}
        </div>
      )}

      {/* Outcome form */}
      {showOutcome && (
        <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Call outcome</p>
          <select
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
          >
            <option>Answered</option>
            <option>No Answer</option>
            <option>Busy</option>
            <option>Callback Requested</option>
          </select>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes…"
            rows={3}
            style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #d1d5db', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button
            onClick={handleSaveAndNext}
            style={{ width: '100%', padding: 10, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}
          >
            Save &amp; next lead
          </button>
        </div>
      )}
    </div>
  );
}
