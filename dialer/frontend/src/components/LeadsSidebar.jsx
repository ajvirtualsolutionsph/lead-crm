import { useState } from 'react';

const TABS = ['New Leads', 'Initial Email Sent', 'Needs Follow Up', 'No Reply/Declined'];

const STATUS_COLORS = {
  New: { bg: '#dbeafe', text: '#1d4ed8' },
  Called: { bg: '#f3f4f6', text: '#374151' },
  Callback: { bg: '#fef3c7', text: '#92400e' },
  'Not interested': { bg: '#fee2e2', text: '#b91c1c' },
};

export default function LeadsSidebar({ leads, loading, selectedLead, onSelect, onRefresh, activeSheet, onSwitchSheet }) {
  const [query, setQuery] = useState('');

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.phone.includes(query)
  );

  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', height: '100%' }}>
      {/* Sheet tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 8px 0', borderBottom: '1px solid #e5e7eb' }}>
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
              borderColor: activeSheet === tab ? '#3b82f6' : '#d1d5db',
              background: activeSheet === tab ? '#eff6ff' : '#f9fafb',
              color: activeSheet === tab ? '#1d4ed8' : '#374151',
              fontWeight: activeSheet === tab ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search + refresh */}
      <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search leads…"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
          />
          <button
            onClick={() => onRefresh(activeSheet)}
            title="Refresh"
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: 13 }}
          >
            ↻
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{filtered.length} leads</p>
      </div>

      {/* Lead list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && <p style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>No leads found.</p>
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
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                background: isSelected ? '#eff6ff' : '#fff',
                borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.name || '(no name)'}</span>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10, background: badge.bg, color: badge.text }}>
                  {lead.status || 'New'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#374151' }}>{lead.phone}</div>
              {lead.website && (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}
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
