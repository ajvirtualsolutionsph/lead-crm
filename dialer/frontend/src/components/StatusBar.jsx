const STATUS_LABELS = {
  idle: 'Ready',
  connecting: 'Connecting…',
  ringing: 'Ringing…',
  'in-call': 'In Call',
  error: 'Error',
};

const STATUS_COLORS = {
  idle: '#6b7280',
  connecting: '#f59e0b',
  ringing: '#3b82f6',
  'in-call': '#10b981',
  error: '#ef4444',
};

export default function StatusBar({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ color }}>{STATUS_LABELS[status] || 'Unknown'}</span>
    </div>
  );
}
