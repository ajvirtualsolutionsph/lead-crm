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
GOOGLE_SHEET_ID=             # Ready for Call spreadsheet (dedicated dialer sheet, single tab)
LEAD_GEN_SHEET_ID=           # Lead Gen Pipeline spreadsheet (source for auto-sync)
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

## Google Sheets

**Two spreadsheets:**
- **Lead Gen Pipeline** (`LEAD_GEN_SHEET_ID`) — source of truth; tabs: New Leads | Initial Email Sent | Needs Follow Up | Ready for Call
- **Ready for Call** (`GOOGLE_SHEET_ID`) — dedicated dialer sheet (ID: `11-QP3JSPd2KS-8zWP4az1ZTR-qRSx4fciRVbYaZucnk`); single tab synced from Lead Gen Pipeline's "Ready for Call" tab

**Ready for Call sheet — column layout (A–X):**

| Col | Header | Notes |
|-----|--------|-------|
| A | name | fallback display name |
| B | business_name | display name (primary) |
| C | category | |
| D | address | |
| E | phone | dial target — auto-normalized to E.164 |
| F | website | sidebar link |
| G | email | |
| H | operating_hours | |
| I | rating | |
| J | review_count | |
| K | notes | read-only display (from Lead Gen) |
| L | details | |
| M–U | email/status cols | copied from Lead Gen, not used by dialer |
| V | call_status | dialer disposition (New/Called/Callback/Not interested) — WRITE |
| W | last_called | ISO timestamp of last dialer call — WRITE |
| X | dialer_notes | editable notes per lead; auto-saved by dialer — WRITE |

`getLeads(sheetName)` reads `'Ready for Call'!A:X`. `updateLead(rowIndex, status, notes, sheetName)` writes V, W, X. `updateDialerNotes(rowIndex, notes, sheetName)` writes X only (auto-save). `syncFromLeadGen()` pulls "Ready for Call" tab rows (A:U) from Lead Gen Pipeline, deduplicates by phone OR business name, appends to dialer sheet.

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
POST /leads/sync                     — pull new leads from Lead Gen Pipeline (dedup by phone OR name)
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

## Session 15 — New dialer sheet + script panel (2026-05-14)
- Replaced Phone Dialer - Leads with new "Ready for Call" spreadsheet (`11-QP3JSPd2KS-8zWP4az1ZTR-qRSx4fciRVbYaZucnk`)
- Single tab only — "Ready for Call"; sync pulls from Lead Gen Pipeline's "Ready for Call" tab
- Rewrote `sheets.js`: new column layout (notes=K, call_status=V, last_called=W, dialer_notes=X)
- Removed `initDialerColumns` (was crashing backend on startup → sync failed)
- Pulled 100 leads from Lead Gen Pipeline sorted: 19 priority (name+hours) on top, 81 below
- Applied compact sheet formatting: 21px rows, frozen header, blue header, alternating bands
- Removed tab switcher UI — single sheet, no tabs needed
- Added cold calling script (AJ_Cold_Calling_Flow.docx) to bottom half of NotesPanel

## Session 16 — Supabase wipe + housekeeping (2026-05-14)
- Wiped all 21 rows from Supabase `calls` table — fresh start; Google Sheets untouched
- Confirmed auto-sync from Lead Gen Pipeline runs every 30 min (no changes needed)
- Confirmed Recent Calls "Clear" button already exists in UI (local hide only, not Supabase delete)
- Frontend URL: https://phone-dialer-six.vercel.app

## Session 17 — Lead details panel + notes without calling (2026-05-14)
- Split bottom half of NotesPanel into two equal vertical panes: left = Cold Calling Script, right = Lead Details
- Lead Details pane shows all available fields from the sheet (business, phone, email, website, category, address, hours, rating, reviews, details, notes, status, last called); empty fields hidden
- Backend `sheets.js` `getLeads()` now returns 6 extra fields: `category`, `address`, `operating_hours`, `rating`, `review_count`, `details` (cols C, D, H, I, J, L)
- Renamed "Call Notes" label to "Notes" — notes auto-save to col X without requiring an active call
- Fixed CORS: backend now allows `localhost:5174` alongside `localhost:5173` (frontend port drift when both instances run)
- `selectedLead` prop added to `NotesPanel` via `App.jsx`

## Session 18 — Website preview in Lead Details (2026-05-14)
- Lead Details pane restructured: script pane narrowed to 35%, details pane gets 65%
- Compact 2-column grid for lead fields (Business/Phone, Email/Category, etc.) saves vertical space
- Website iframe embedded in Lead Details pane — always visible, fills all remaining height below the fields
- Website URL bar shows the link with ↗ open-in-new-tab; "No website on file" shown when absent
- Fallback message shown when site blocks iframe embedding (X-Frame-Options)
- `webPreviewError` state resets when switching leads
- Removed Recent Calls section from Col 3 (CallLog no longer rendered)
- `react-resizable-panels` was attempted but reverted — too disruptive
- **Files changed:** `dialer/frontend/src/App.jsx`, `dialer/frontend/src/components/NotesPanel.jsx`

## Next
- [ ] **Deploy session 18 changes** — push frontend to Vercel (backend unchanged)
- [ ] **Deploy session 17 backend changes** — push backend to Render (sheets.js, index.js)
- [ ] **Test sync** — click ⇩ Sync in the dialer, verify leads appear correctly
- [ ] **Test AMD** — call a voicemail number, confirm "Voicemail" logs within 5s
- [ ] **Real dialing session** — work through actual leads at scale
- [ ] **Change UptimeRobot to 1-min interval** — via UptimeRobot dashboard (currently 5 min)
- [ ] **GitHub profile** — add repo descriptions, topics, README (via GitHub web UI)
- [ ] **Optional**: when SignalWire enables +63 dialing, agent can receive calls directly
- [ ] **Later**: investigate WebRTC audio (needs TURN relay or different ISP)
