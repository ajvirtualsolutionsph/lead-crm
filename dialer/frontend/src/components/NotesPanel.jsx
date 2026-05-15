import { useState, useEffect } from 'react';
import axios from 'axios';
import { T } from '../theme.js';

const EDITABLE_FIELDS = [
  { label: 'Business', key: 'name',             apiField: 'business_name' },
  { label: 'Phone',    key: 'phone',            apiField: 'phone' },
  { label: 'Email',    key: 'email',            apiField: 'email' },
  { label: 'Category', key: 'category',         apiField: 'category' },
  { label: 'Address',  key: 'address',          apiField: 'address' },
  { label: 'Hours',    key: 'operating_hours',  apiField: 'operating_hours' },
];

const READONLY_FIELDS = [
  { label: 'Rating',   key: 'rating' },
  { label: 'Reviews',  key: 'review_count' },
  { label: 'Notes',    key: 'notes' },
  { label: 'Details',  key: 'details' },
  { label: 'Status',   key: 'status' },
  { label: 'Called',   key: 'lastCalled' },
];

const inputStyle = {
  width: '100%',
  padding: '3px 6px',
  fontSize: 11,
  border: `1px solid ${T.borderStrong}`,
  borderRadius: 4,
  background: T.inputBg,
  color: T.textPrimary,
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};

export default function NotesPanel({ notes, setNotes, selectedLead }) {
  const [fieldValues, setFieldValues] = useState({});
  const [webPreviewError, setWebPreviewError] = useState(false);
  const [website, setWebsite] = useState('');

  // Reset fields when lead changes
  useEffect(() => {
    setWebPreviewError(false);
    if (!selectedLead) { setFieldValues({}); setWebsite(''); return; }
    const vals = {};
    EDITABLE_FIELDS.forEach(f => { vals[f.key] = selectedLead[f.key] || ''; });
    setFieldValues(vals);
    setWebsite(selectedLead.website || '');
  }, [selectedLead?.rowIndex, selectedLead?.sheet]);

  function handleFieldBlur(apiField, currentValue, originalValue) {
    if (currentValue === originalValue || !selectedLead?.rowIndex) return;
    axios.patch(`/leads/${selectedLead.rowIndex}/info`, {
      field: apiField,
      value: currentValue,
      sheet: selectedLead.sheet,
    }).catch(err => console.error('Field save error:', err));
  }

  function handleWebsiteBlur(currentValue) {
    const original = selectedLead?.website || '';
    if (currentValue === original || !selectedLead?.rowIndex) return;
    setWebPreviewError(false);
    axios.patch(`/leads/${selectedLead.rowIndex}/info`, {
      field: 'website',
      value: currentValue,
      sheet: selectedLead.sheet,
    }).catch(err => console.error('Website save error:', err));
  }

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
      {/* Notes section */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.borderMuted}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          Notes
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Type notes here… auto-saved"
          style={{
            width: '100%',
            height: 120,
            padding: 8,
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

      {/* Lead details header */}
      <div style={{ padding: '6px 14px', borderBottom: `1px solid ${T.borderMuted}`, background: T.sidebarBg, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lead Details</span>
      </div>

      {/* Editable + read-only fields */}
      <div style={{ flexShrink: 0, padding: '8px 14px', borderBottom: `1px solid ${T.borderStrong}`, overflowY: 'auto', maxHeight: 240 }}>
        {!selectedLead ? (
          <span style={{ color: T.textMuted, fontStyle: 'italic', fontSize: 12 }}>Select a lead to view details</span>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            {/* Editable fields */}
            {EDITABLE_FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</span>
                <input
                  type="text"
                  value={fieldValues[f.key] ?? ''}
                  onChange={e => setFieldValues(v => ({ ...v, [f.key]: e.target.value }))}
                  onBlur={e => handleFieldBlur(f.apiField, e.target.value, selectedLead[f.key] || '')}
                  style={inputStyle}
                />
              </div>
            ))}

            {/* Read-only fields */}
            {READONLY_FIELDS.filter(f => selectedLead[f.key]).map(f => (
              <div key={f.key} style={{ display: 'flex', gap: 4, alignItems: 'baseline', minWidth: 0 }}>
                <span style={{ flex: '0 0 52px', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{f.label}</span>
                <span style={{ color: T.textPrimary, fontSize: 11, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead[f.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Website bar */}
      <div style={{ flexShrink: 0, padding: '5px 12px', borderBottom: `1px solid ${T.borderStrong}`, background: T.sidebarBg, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>Website:</span>
        {selectedLead ? (
          <>
            <input
              type="text"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              onBlur={e => handleWebsiteBlur(e.target.value)}
              placeholder="https://…"
              style={{ ...inputStyle, flex: 1, fontSize: 11 }}
            />
            {website && (
              <a href={website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', flexShrink: 0 }}>↗</a>
            )}
          </>
        ) : (
          <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No lead selected</span>
        )}
      </div>

      {/* Website iframe */}
      <div style={{ flex: 1, position: 'relative', background: '#0f172a', minHeight: 0 }}>
        {!selectedLead?.website && !website ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>No website on file</div>
        ) : webPreviewError ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 16, textAlign: 'center', fontSize: 12, color: T.textMuted, flexDirection: 'column', gap: 8 }}>
            <span>This site blocks embedded previews.</span>
            <a href={website || selectedLead?.website} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Open in new tab ↗</a>
          </div>
        ) : (
          <iframe
            key={website || selectedLead?.website}
            src={website || selectedLead?.website}
            title="Website Preview"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onError={() => setWebPreviewError(true)}
          />
        )}
      </div>
    </div>
  );
}
