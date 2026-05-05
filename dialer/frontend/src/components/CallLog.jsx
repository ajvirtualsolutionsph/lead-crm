import { useEffect, useState } from 'react';
import axios from 'axios';
import { T } from '../theme.js';

function formatDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function CallLog({ refreshKey }) {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    axios.get('/calls')
      .then(r => setCalls(r.data))
      .catch(err => console.error('Failed to fetch call log:', err));
  }, [refreshKey]);

  return (
    <div style={{ padding: 20, background: T.panelBg, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: T.textPrimary }}>Recent Calls</h2>
        {calls.length > 0 && (
          <button
            onClick={() => setCalls([])}
            style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', border: `1px solid ${T.borderStrong}`, borderRadius: 4, color: T.textMuted, cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>
      {calls.length === 0 ? (
        <p style={{ color: T.textMuted, fontSize: 13 }}>No calls yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.borderStrong}`, textAlign: 'left' }}>
                {['Name','Phone','Duration','Status','Time'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', color: T.textMuted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.borderMuted}` }}>
                  <td style={{ padding: '6px 8px', color: T.textPrimary }}>{c.lead_name || '—'}</td>
                  <td style={{ padding: '6px 8px', color: T.textPrimary }}>{c.phone}</td>
                  <td style={{ padding: '6px 8px', color: T.textPrimary }}>{formatDuration(c.duration_seconds)}</td>
                  <td style={{ padding: '6px 8px', color: T.textPrimary }}>{c.status}</td>
                  <td style={{ padding: '6px 8px', color: T.textMuted }}>{formatTime(c.called_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
