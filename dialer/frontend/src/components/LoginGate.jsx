import { useState } from 'react';
import { T } from '../theme.js';

const CORRECT_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD;
const SESSION_KEY = 'crm_authed';

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export default function LoginGate({ onAuth }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!CORRECT_PASSWORD) {
      setError('No login password configured.');
      return;
    }
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onAuth();
    } else {
      setError('Incorrect password.');
      setPassword('');
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: T.appBg,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: T.panelBg,
        border: `1px solid ${T.borderMuted}`,
        borderRadius: 12,
        padding: '40px 48px',
        width: 340,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div>
          <div style={{ color: T.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Lead CRM
          </div>
          <div style={{ color: T.textMuted, fontSize: 13 }}>AJ Virtual Solutions</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            autoFocus
            style={{
              background: T.inputBg,
              border: `1px solid ${error ? T.hangupRed : T.borderStrong}`,
              borderRadius: 6,
              color: T.textPrimary,
              fontSize: 14,
              padding: '10px 12px',
              outline: 'none',
            }}
          />
          {error && (
            <div style={{ color: T.hangupRed, fontSize: 13 }}>{error}</div>
          )}
          <button
            type="submit"
            style={{
              background: T.accent,
              color: '#0d1a2b',
              border: 'none',
              borderRadius: 6,
              padding: '10px 0',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
