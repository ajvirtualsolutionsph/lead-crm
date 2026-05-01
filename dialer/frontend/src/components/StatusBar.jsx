import { T } from '../theme.js';

const STATUS_LABELS = {
  initializing: 'Initializing…',
  ready:        'Ready',
  connecting:   'Connecting…',
  ringing:      'Ringing…',
  'in-call':    'In Call',
  error:        'Error — check backend',
};

const STATUS_COLORS = {
  initializing: T.statusConnecting,
  ready:        T.statusIdle,
  connecting:   T.statusConnecting,
  ringing:      T.statusRinging,
  'in-call':    T.statusInCall,
  error:        T.statusError,
};

export default function StatusBar({ status }) {
  const color = STATUS_COLORS[status] || T.statusIdle;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.sidebarBg, borderBottom: `1px solid ${T.borderMuted}`, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ color }}>{STATUS_LABELS[status] || 'Unknown'}</span>
    </div>
  );
}
