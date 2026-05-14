import { useState } from 'react';
import { T } from '../theme.js';

const TABS = ['New Leads', 'Initial Email Sent', 'Needs Follow Up', 'No Reply/Declined'];

const STATUS_COLORS = {
  New:              T.badgeNew,
  Called:           T.badgeCalled,
  Callback:         T.badgeCallback,
  'Not interested': T.badgeNotInt,
};

export default function LeadsSidebar({ leads, loading, selectedLead, onSelect, onRefresh, activeSheet, onSwitchSheet, onSync }) {
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await onSync();
      setSyncMsg(result.added > 0 ? `+${result.added} new leads` : 'Up to date');
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  }

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.phone.includes(query)
  );

  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.borderMuted}`, height: '100%', background: T.sidebarBg }}>
      {/* Sheet tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 8px 0', borderBottom: `1px solid ${T.borderMuted}` }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onSwitchSheet(tab)}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid',
              cursor: 'pointer',
              borderColor: activeSheet === tab ? T.accent : T.borderStrong,
              background: activeSheet === tab ? T.accentBg : T.inputBg,
              color: activeSheet === tab ? T.accent : T.textMuted,
              fontWeight: activeSheet === tab ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search + refresh */}
      <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${T.borderMuted}` }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search leads…"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: `1px solid ${T.borderStrong}`, fontSize: 13, background: T.inputBg, color: T.textPrimary }}
          />
          <button
            onClick={() => onRefresh(activeSheet)}
            title="Refresh"
            style={{ padding: '6px 10px', borderRadius: 4, border: `1px solid ${T.borderStrong}`, background: T.inputBg, cursor: 'pointer', fontSize: 13, color: T.textPrimary }}
          >
            ↻
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync new leads from Lead Gen Pipeline"
            style={{ padding: '6px 10px', borderRadius: 4, border: `1px solid ${T.borderStrong}`, background: T.inputBg, cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 13, color: T.accent, opacity: syncing ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {syncing ? '…' : '⇩ Sync'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>{filtered.length} leads</p>
          {syncMsg && <p style={{ margin: 0, fontSize: 12, color: syncMsg.includes('failed') ? '#f87171' : '#4ade80' }}>{syncMsg}</p>}
        </div>
      </div>

      {/* Lead list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && <p style={{ padding: 12, color: T.textMuted, fontSize: 13 }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: 12, color: T.textMuted, fontSize: 13 }}>No leads found.</p>
        )}
        {filtered.map(lead => {
          const isSelected = selectedLead?.rowIndex === lead.rowIndex && selectedLead?.sheet === lead.sheet;
          const badge = STATUS_COLORS[lead.status] || STATUS_COLORS['New'];
          return (
            <div
              key={`${lead.sheet}-${lead.rowIndex}`}
              onClick={() => onSelect(lead)}
              style={{
                padding: '10px 12px',
                borderBottom: `1px solid ${T.borderMuted}`,
                cursor: 'pointer',
                background: isSelected ? T.accentBg : T.panelBg,
                borderLeft: isSelected ? `3px solid ${T.accent}` : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: T.textPrimary }}>{lead.name || '(no name)'}</span>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10, background: badge.bg, color: badge.text }}>
                  {lead.status || 'New'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: T.textMuted }}>{lead.phone}</div>
              {lead.website && (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, color: T.accent, textDecoration: 'none' }}
                >
                  {lead.website}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
