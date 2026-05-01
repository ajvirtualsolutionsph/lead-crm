import { useState, useEffect } from 'react';
import axios from 'axios';
import { T } from '../theme.js';

const KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Dialer({ sw, selectedLead, onCallLogged, leads, setSelectedLead, transcript, interimText }) {
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

  // Pre-fill notes with transcript when outcome form appears
  useEffect(() => {
    if (showOutcome && transcript && transcript.length > 0) {
      const body = transcript
        .map(e => `[${e.time}] You: ${e.text}`)
        .join('\n');
      setNotes(body);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOutcome]);

  function handleCall() {
    setShowOutcome(false);
    setNotes('');
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
    <div style={{ padding: 20, background: T.panelBg, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, color: T.textPrimary }}>Dialer</h2>

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={e => setNumber(e.target.value)}
        placeholder="+1XXXXXXXXXX"
        disabled={isActive}
        style={{ width: '100%', padding: '10px 12px', fontSize: 18, border: `1px solid ${T.borderStrong}`, borderRadius: 6, marginBottom: 12, boxSizing: 'border-box', background: T.inputBg, color: T.textPrimary }}
      />

      {/* Dial pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => setNumber(n => n + k)}
            disabled={isActive}
            style={{ padding: '14px 0', fontSize: 18, borderRadius: 6, border: `1px solid ${T.borderStrong}`, background: T.dialpadBg, cursor: 'pointer', color: T.textPrimary }}
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
            style={{ flex: 1, padding: 14, background: T.callGreen, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' }}
          >
            Call
          </button>
        )}
        {isActive && (
          <>
            <button
              onClick={handleHangUp}
              style={{ flex: 1, padding: 14, background: T.hangupRed, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer' }}
            >
              Hang Up
            </button>
            <button
              onClick={toggleMute}
              style={{ padding: '14px 18px', background: isMuted ? T.mutedGrey : T.muteActiveBg, border: `1px solid ${T.borderStrong}`, borderRadius: 6, fontSize: 14, cursor: 'pointer', color: T.textPrimary }}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </>
        )}
      </div>

      {/* Live timer + transcript */}
      {status === 'in-call' && (
        <>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 22, fontVariantNumeric: 'tabular-nums', color: T.statusInCall }}>
            {formatDuration(callDuration)}
          </div>

          <div style={{
            marginTop: 12,
            background: T.transcriptBg,
            border: `1px solid ${T.transcriptBorder}`,
            borderRadius: 6,
            padding: '8px 10px',
            maxHeight: 160,
            overflowY: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            <div style={{ marginBottom: 4, fontSize: 11, color: T.textMuted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Live Transcription (your voice only)
            </div>

            {(!transcript || transcript.length === 0) && !interimText && (
              <div style={{ color: T.textMuted, fontStyle: 'italic' }}>Listening…</div>
            )}

            {transcript && transcript.map((entry, i) => (
              <div key={i} style={{ marginBottom: 3 }}>
                <span style={{ color: T.transcriptTime, marginRight: 6 }}>{entry.time}</span>
                <span style={{ color: T.transcriptLabel, fontWeight: 600, marginRight: 4 }}>You:</span>
                <span style={{ color: T.transcriptText }}>{entry.text}</span>
              </div>
            ))}

            {interimText && (
              <div style={{ color: T.textMuted, fontStyle: 'italic' }}>
                <span style={{ color: T.transcriptLabel, fontWeight: 600, marginRight: 4 }}>You:</span>
                {interimText}
                <span style={{ animation: 'blink 1s step-start infinite' }}>▋</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Outcome form */}
      {showOutcome && (
        <div style={{ marginTop: 16, padding: 16, background: T.inputBg, borderRadius: 6, border: `1px solid ${T.borderStrong}` }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: T.textPrimary }}>Call outcome</p>
          <select
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: `1px solid ${T.borderStrong}`, background: T.inputBg, color: T.textPrimary }}
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
            style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: `1px solid ${T.borderStrong}`, resize: 'vertical', boxSizing: 'border-box', background: T.inputBg, color: T.textPrimary }}
          />
          <button
            onClick={handleSaveAndNext}
            style={{ width: '100%', padding: 10, background: T.saveBlue, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}
          >
            Save &amp; next lead
          </button>
        </div>
      )}
    </div>
  );
}
