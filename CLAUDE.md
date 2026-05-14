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
        ├── components/   Dialer.jsx, LeadsSidebar.jsx, NotesPanel.jsx, CallLog.jsx, StatusBar.jsx
        └── hooks/        useSignalWire.js, useLeads.js
```

## Call Architecture — Agent-Calls-In Conference Bridge
- No WebRTC in browser — pure REST + LaML conference
- Call flow: `POST /calls/initiate { to, leadName, rowIndex, sheetName }` → backend dials lead only → lead hears hold music → agent dials +12525303318 from their phone → both bridged
- Lead TwiML: `<Conference startConferenceOnEnter="false" endConferenceOnExit="true">` — lead hears hold music until agent joins
- Agent TwiML: `<Conference startConferenceOnEnter="true" endConferenceOnExit="true">` — served via `POST /calls/inbound` webhook when agent calls in
- Hang up: `POST /calls/hangup { callSid: leadCallSid }` — clears `callState`
- `callState` object stored in memory on backend (confName, leadCallSid, leadPhone, leadName, rowIndex, sheetName, disposition, startedAt) — single-agent dialer, one call at a time
- Backend auto-configures SignalWire inbound webhook on startup via `RENDER_EXTERNAL_URL`
- **Ring timeout**: `Timeout: '25'` — SignalWire auto-terminates if lead doesn't answer in 25s
- **AMD**: `MachineDetection: 'Enable'` — voicemail detected in 3–5s, call auto-hung up
- **StatusCallback**: `POST /calls/status-callback` — auto-logs No Answer / Busy / Voicemail / Failed to Supabase + Sheets
- **Status polling**: `GET /calls/status` — frontend polls every 3s while in-call; on auto-termination shows toast and skips to next lead
- **Why agent-calls-in**: SignalWire international dialing to +63 blocked; agent calling a US number works from any VoIP app
- **Why not WebRTC**: Philippines ISP blocks UDP → ICE connectivity times out (see WebRTC history below)

## WebRTC investigation history (session 3)
1. Tried `client.dial({ to: phoneNumber })` via Call Fabric subscriber token — "Invalid RTCPeer ID"
2. Tried `Video.RoomSession` + `<Connect><Room>` TwiML — PSTN leg worked, browser ICE timed out (UDP blocked)
3. Microphone fix: must call `getUserMedia()` before `SignalWire()` init
4. Root cause: Philippines ISP blocks UDP; TURN relay candidates not gathered
5. Solution: PSTN conference bridge — no browser audio needed

## UI Layout (session 12)
Three-column layout:
- **Col 1 — Leads** (280px): sheet tabs, search, lead list
- **Col 2 — Notes** (flex): persistent notes textarea + live transcription during call + outcome form post-call
- **Col 3 — Dialpad** (270px): compact phone input, dialpad, Call/Hang Up, join-call banner, live timer, recent calls log

Notes auto-save to Google Sheets col X (1.5s debounce after typing stops). Selecting a lead loads its saved notes. Notes persist across page sessions via the sheet.

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
API_SECRET=                  # shared secret — must match VITE_API_SECRET in frontend
RENDER_EXTERNAL_URL=         # set automatically by Render
```

## Frontend .env
```
VITE_BACKEND_URL=http://localhost:3001
VITE_SIGNALWIRE_SPACE_URL=aj-virtual-solutions.signalwire.com
VITE_SIGNALWIRE_FROM_NUMBER=+12525303318
VITE_API_SECRET=             # shared secret — must match API_SECRET in backend
```

## Dev commands
```bash
cd dialer/backend && node index.js
cd dialer/frontend && npm run dev
```

## Google Sheet — existing spreadsheet (4 tabs)
Tabs: New Leads | Initial Email Sent | Needs Follow Up | No Reply/Declined

| Col | Header | Dialer use |
|-----|--------|------------|
| A | name | fallback display name |
| B | business_name | display name (primary) |
| E | phone | dial target — auto-normalized to E.164 |
| F | website | sidebar link |
| J | notes | existing column — do NOT write here |
| U | aging_days | existing column — do not overwrite |
| V | call_status | dialer disposition (New/Called/Callback/Not interested) |
| W | last_called | ISO timestamp of last dialer call |
| X | dialer_notes | editable notes per lead; auto-saved by dialer |

`getLeads(sheetName)` reads `'SheetName'!A:X`. `updateLead(rowIndex, status, notes, sheetName)` writes V, W, X. `updateDialerNotes(rowIndex, notes, sheetName)` writes X only (used for auto-save without touching status/timestamp). Column X initialized via `initDialerColumns()` on backend startup.

## Supabase calls table
```sql
create table calls (
  id uuid primary key default gen_random_uuid(),
  lead_name text, phone text not null,
  duration_seconds integer, status text, notes text,
  called_at timestamptz default now()
);
```

## API endpoints (auth required: x-api-key header on all /calls/* and /leads/*)
```
GET  /health                         — uptime check
GET  /leads?sheet=                   — fetch leads for a tab
GET  /leads/tabs                     — list sheet tab names
PATCH /leads/:rowIndex               — update status + notes + last_called (post-call)
PATCH /leads/:rowIndex/notes         — update notes only (auto-save, no status change)
POST /calls/initiate                 — start outbound call to lead
POST /calls/hangup                   — hang up active call
GET  /calls/status                   — poll call state (disposition, elapsed)
GET  /calls                          — recent calls from Supabase
POST /calls                          — log a completed call to Supabase + Sheets
POST /calls/inbound    (webhook)     — agent joins conference
POST /calls/status-callback (webhook)— SignalWire status events (AMD, no-answer, etc.)
```

## Security
- `x-api-key` header required on all `/calls/*` and `/leads/*` routes; SignalWire webhooks exempted
- Helmet.js security headers
- Rate limit: `POST /calls/initiate` capped at 20 req/min per IP
- HMAC-SHA1 webhook signature validation (production only)
- E.164 phone number validation before dialing
- Env var startup check — backend exits if any required var is missing

## Deployment
- Backend: https://phone-dialer-shl2.onrender.com (Render, free tier)
- Frontend: https://phone-dialer-six.vercel.app (Vercel)
- UptimeRobot: pings `/health` every 5 min to keep Render awake

## Agent workflow
- Agent joins calls by dialing **+12525303318** via **Viber Out** from PH phone
- Best window: **9–11 PM PHT** = 9–11 AM US Eastern (East Coast leads first)
- West Coast leads require midnight+ PHT

---

## Next
- [ ] **Test AMD** — call a voicemail number, confirm "Voicemail" logs within 5s
- [ ] **Real dialing session** — work through actual leads at scale
- [ ] **Change UptimeRobot to 1-min interval** — via UptimeRobot dashboard (currently 5 min)
- [ ] **GitHub profile** — add repo descriptions, topics, README (via GitHub web UI)
- [ ] **Optional**: when SignalWire enables +63 dialing, agent can receive calls directly
- [ ] **Later**: investigate WebRTC audio (needs TURN relay or different ISP)
