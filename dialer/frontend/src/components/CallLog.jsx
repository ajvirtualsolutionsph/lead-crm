import { useEffect, useState } from 'react';
import axios from 'axios';

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
    axios.get('/api/calls')
      .then(r => setCalls(r.data))
      .catch(err => console.error('Failed to fetch call log:', err));
  }, [refreshKey]);

  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: 16 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Recent Calls</h2>
      {calls.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: 13 }}>No calls yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                {['Name','Phone','Duration','Status','Time'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px' }}>{c.lead_name || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{c.phone}</td>
                  <td style={{ padding: '6px 8px' }}>{formatDuration(c.duration_seconds)}</td>
                  <td style={{ padding: '6px 8px' }}>{c.status}</td>
                  <td style={{ padding: '6px 8px', color: '#6b7280' }}>{formatTime(c.called_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
