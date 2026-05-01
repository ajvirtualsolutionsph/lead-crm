import { useEffect, useState } from 'react';

const STATUS_COLORS = {
  New: { bg: '#dbeafe', text: '#1d4ed8' },
  Called: { bg: '#f3f4f6', text: '#374151' },
  Callback: { bg: '#fef3c7', text: '#92400e' },
  'Not interested': { bg: '#fee2e2', text: '#b91c1c' },
};

export default function LeadsSidebar({ leads, loading, selectedLead, onSelect, onRefresh }) {
  const [query, setQuery] = useState('');

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.phone.includes(query)
  );

  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', height: '100%' }}>
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search leads…"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
          />
          <button
            onClick={onRefresh}
            title="Refresh"
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: 13 }}
          >
            ↻
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{filtered.length} leads</p>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && <p style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>No leads found.</p>
        )}
        {filtered.map(lead => {
          const isSelected = selectedLead?.rowIndex === lead.rowIndex;
          const badge = STATUS_COLORS[lead.status] || STATUS_COLORS['New'];
          return (
            <div
              key={lead.rowIndex}
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
