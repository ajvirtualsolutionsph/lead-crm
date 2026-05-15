import { T } from '../theme.js';

export default function StatusBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.sidebarBg, borderBottom: `1px solid ${T.borderMuted}`, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.statusIdle, display: 'inline-block' }} />
      <span style={{ color: T.statusIdle, fontWeight: 600 }}>AJ Virtual Solutions CRM</span>
    </div>
  );
}
