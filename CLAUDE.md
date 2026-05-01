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

## Google Sheet columns (row 1 = headers)
A: Name | B: Phone (E.164) | C: Website | D: Status | E: Notes | F: Last Called

Note: Phone must be in E.164 format (+1XXXXXXXXXX) for dialing to work.

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
- [x] Git repo initialized with commits

### 🔲 Next Session
- [ ] **Test an actual call** — type a US number manually (`+1XXXXXXXXXX`), hit Call, verify PSTN rings
- [ ] **Fix Google Sheet column order** — current sheet columns don't match expected layout, or remap `lib/sheets.js` to match actual sheet
- [ ] **Push to GitHub** — create repo at github.com/new (private, no README), add remote, push

### 🔲 Later
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Set `VITE_BACKEND_URL` to Render URL after deploy
- [ ] End-to-end test on deployed URLs
