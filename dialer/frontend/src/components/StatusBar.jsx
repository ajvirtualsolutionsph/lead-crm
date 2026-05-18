import { T } from '../theme.js';

export default function StatusBar({ onLogout }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.sidebarBg, borderBottom: `1px solid ${T.borderMuted}`, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.statusIdle, display: 'inline-block' }} />
      <span style={{ color: T.statusIdle, fontWeight: 600 }}>AJ Virtual Solutions CRM</span>
      <button
        onClick={onLogout}
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: `1px solid ${T.borderMuted}`,
          borderRadius: 4,
          color: T.textMuted,
          fontSize: 12,
          padding: '2px 10px',
          cursor: 'pointer',
        }}
      >
        Log out
      </button>
    </div>
  );
}
