# PH-to-US Dialer

Browser-based softphone to call US numbers from the Philippines. SignalWire WebRTC for calls, Google Sheets for leads, Supabase for call logging.

## Stack
- Backend: Node.js + Express (ES modules), port 3001 — deploy to Render
- Frontend: React + Vite, port 5173 — deploy to Vercel
- Telephony: SignalWire Call Fabric v3 (`@signalwire/js`, `@signalwire/node`)
- Leads: Google Sheets API v4
- Call log: Supabase (Postgres)

## Structure
```
dialer/
├── backend/
│   ├── index.js
│   ├── routes/       token.js, leads.js, calls.js
│   ├── lib/          sheets.js, supabase.js
│   └── .env          ← never commit
└── frontend/
    └── src/
        ├── components/   Dialer.jsx, LeadsSidebar.jsx, CallLog.jsx, StatusBar.jsx
        └── hooks/        useSignalWire.js, useLeads.js
```

## SDK Architecture (Call Fabric v3)
- Token: `POST /api/relay/rest/jwt` — returns RELAY JWT, no SMS verification needed
- Frontend: `SignalWire({ token, host })` from `@signalwire/js` v3
- Call flow: `client.dial({ to, audio: true })` → `call.start()` / `call.end()` / `call.audioMute()`
- No TwiML webhooks needed — all routing over WebSocket

## Backend .env
```
SIGNALWIRE_PROJECT_ID=
SIGNALWIRE_API_TOKEN=
SIGNALWIRE_SPACE_URL=        # aj-virtual-solutions.signalwire.com
SIGNALWIRE_PHONE_NUMBER=     # +12525303318
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Frontend .env
```
VITE_BACKEND_URL=http://localhost:3001
VITE_SIGNALWIRE_SPACE_URL=aj-virtual-solutions.signalwire.com
```

## Dev commands
```bash
# backend
cd dialer/backend && node index.js

# frontend
cd dialer/frontend && npm run dev
```

## Google Sheet — existing spreadsheet (4 tabs)
Tabs: New Leads | Initial Email Sent | Needs Follow Up | No Reply/Declined

| Col | Header | Dialer use |
|-----|--------|------------|
| A | name | (fallback display name) |
| B | business_name | display name (primary) |
| E | phone | dial target — auto-normalized to E.164 |
| F | website | sidebar link |
| J | notes | call notes (written on update) |
| U | aging_days | existing column — do not overwrite |
| V | call_status | dialer disposition (New/Called/Callback/Not interested) |
| W | last_called | ISO timestamp of last dialer call |

`getLeads(sheetName)` reads `'SheetName'!A:W` — defaults to `'No Reply/Declined'`. `updateLead(rowIndex, status, notes, sheetName)` writes J, V, W via batchUpdate to the correct tab. `GET /api/leads?sheet=` accepts sheet name as query param.

## Supabase calls table
```sql
create table calls (
  id uuid primary key default gen_random_uuid(),
  lead_name text, phone text not null,
  duration_seconds integer, status text, notes text,
  called_at timestamptz default now()
);
```

---

## Roadmap

### ✅ Done
- [x] Full project scaffolded (backend + frontend)
- [x] All dependencies installed (`tslib` fix included)
- [x] SignalWire credentials in `.env` (Project ID, API Token, Space URL)
- [x] SignalWire phone number purchased: `+12525303318`
- [x] Rewrote SDK integration for Call Fabric v3 (original scaffold used wrong API)
- [x] Token endpoint working — returns valid RELAY JWT
- [x] Google Sheets connected — leads loading (fixed `Sheet1!` range prefix)
- [x] Supabase connected — calls table created
- [x] UI loads and shows green **Ready** status (SignalWire WebSocket connected)
- [x] Git repo initialized and pushed to GitHub — https://github.com/ajvirtualsolutionsph/phone-dialer (private)
- [x] Google Sheets remapped to existing spreadsheet (`1Zq7muXisE8QywVGXtRE6OqyDRl84UKWy37HoorjxO3s`)
- [x] Phone normalization added (US local format → E.164 automatically)
- [x] Added `call_status` (V) and `last_called` (W) columns to all 4 sheet tabs
- [x] `aging_days` column (U) preserved on all 4 tabs
- [x] Leads sidebar has 4 sheet tab buttons — defaults to "No Reply/Declined" on load
- [x] `getLeads(sheetName)` / `updateLead(..., sheetName)` — sheet-aware reads and writes

### 🔲 Next Session
- [ ] **Test an actual call** — start both servers, type a US number (`+1XXXXXXXXXX`), hit Call, verify PSTN rings

### 🔲 Later
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Set `VITE_BACKEND_URL` to Render URL after deploy
- [ ] End-to-end test on deployed URLs
