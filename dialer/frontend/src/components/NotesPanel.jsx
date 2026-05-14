import { T } from '../theme.js';

export default function NotesPanel({
  notes, setNotes,
  outcome, setOutcome,
  showOutcome, saving, autoToast,
  onSaveAndNext,
  transcript, interimText,
  status,
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: `1px solid ${T.borderMuted}`,
      borderRight: `1px solid ${T.borderMuted}`,
      background: T.appBg,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderMuted}` }}>
        <h2 style={{ margin: 0, fontSize: 16, color: T.textPrimary }}>Notes</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflowY: 'auto', gap: 12 }}>

        {/* Live transcription — only while in-call */}
        {status === 'in-call' && (
          <div style={{
            background: T.transcriptBg,
            border: `1px solid ${T.transcriptBorder}`,
            borderRadius: 6,
            padding: '8px 10px',
            maxHeight: 180,
            overflowY: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
            flexShrink: 0,
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
        )}

        {/* Call notes textarea — always visible, grows to fill space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ marginBottom: 4, fontSize: 11, color: T.textMuted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Call Notes
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Type notes here…"
            style={{
              flex: 1,
              width: '100%',
              padding: 10,
              borderRadius: 4,
              border: `1px solid ${T.borderStrong}`,
              resize: 'none',
              boxSizing: 'border-box',
              background: T.inputBg,
              color: T.textPrimary,
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'system-ui, sans-serif',
            }}
          />
        </div>

        {/* Auto-log toast */}
        {autoToast && (
          <div style={{
            padding: '10px 14px',
            background: '#1a2f1a',
            border: '1px solid #4ade80',
            borderRadius: 6,
            color: '#4ade80',
            fontSize: 13,
            textAlign: 'center',
            flexShrink: 0,
          }}>
            {autoToast}
          </div>
        )}

        {/* Outcome form — post-call */}
        {showOutcome && (
          <div style={{ padding: 14, background: T.inputBg, borderRadius: 6, border: `1px solid ${T.borderStrong}`, flexShrink: 0 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: T.textPrimary }}>Call outcome</p>
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
            <button
              onClick={onSaveAndNext}
              disabled={saving}
              style={{ width: '100%', padding: 10, background: T.saveBlue, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save & next lead'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
