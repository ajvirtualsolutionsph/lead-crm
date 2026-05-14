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

## Call Architecture — Agent-Calls-In Conference Bridge (current)
- No WebRTC in browser — pure REST + LaML conference
- Call flow: `POST /api/calls/initiate { to, leadName, rowIndex, sheetName }` → backend dials lead only → lead hears hold music → agent dials +12525303318 from their phone → both bridged
- Lead TwiML: `<Conference startConferenceOnEnter="false" endConferenceOnExit="true">` — lead hears hold music until agent joins
- Agent TwiML: `<Conference startConferenceOnEnter="true" endConferenceOnExit="true">` — served via `POST /calls/inbound` webhook when agent calls in
- Hang up: `POST /api/calls/hangup { callSid: leadCallSid }` — clears `callState`
- Status starts `'ready'` immediately on page load
- No "Your phone" field — agent always dials +12525303318 to join
- `callState` object stored in memory on backend (confName, leadCallSid, leadPhone, leadName, rowIndex, sheetName, disposition, startedAt) — single-agent dialer, one call at a time
- Backend auto-configures SignalWire inbound webhook on startup via `RENDER_EXTERNAL_URL`
- **Ring timeout**: `Timeout: '25'` on outbound call — SignalWire auto-terminates if lead doesn't answer in 25s
- **Answering Machine Detection**: `MachineDetection: 'Enable'` — voicemail detected in 3–5s, call auto-hung up immediately
- **StatusCallback**: `POST /calls/status-callback` — auto-logs No Answer / Busy / Voicemail / Failed to Supabase + Sheets without agent clicks
- **Status polling**: `GET /calls/status` — frontend polls every 3s while in-call; on auto-termination, shows toast and skips to next lead
- **Why agent-calls-in**: SignalWire international dialing to +63 blocked by default; agent calling a US number works from any phone via regular call or VoIP app
- **Why not WebRTC**: UDP ports to SignalWire media servers blocked from Philippines ISP → ICE connectivity check times out.

## WebRTC investigation history (session 3)
1. Tried `client.dial({ to: phoneNumber })` via Call Fabric subscriber token — "Invalid RTCPeer ID", dial address format wrong
2. Tried `Video.RoomSession` + `<Connect><Room>` TwiML — PSTN leg worked (call lasted 24s), browser ICE timed out (UDP blocked)
3. Microphone permission fix: must call `getUserMedia()` before `SignalWire()` init
4. Root cause: Philippines ISP blocks UDP; TURN relay candidates not gathered by `Video.RoomSession`
5. Solution: PSTN conference bridge — no browser audio needed

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
| J | notes | existing column — do NOT write here |
| U | aging_days | existing column — do not overwrite |
| V | call_status | dialer disposition (New/Called/Callback/Not interested) |
| W | last_called | ISO timestamp of last dialer call |
| X | dialer_notes | call outcome notes written by dialer (new column, session 6) |

`getLeads(sheetName)` reads `'SheetName'!A:X` — defaults to `'No Reply/Declined'`. `updateLead(rowIndex, status, notes, sheetName)` writes V, W, X via batchUpdate to the correct tab. Column X added via `initDialerColumns()` called on backend startup. `GET /api/leads?sheet=` accepts sheet name as query param.

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
- [x] Git repo initialized and pushed to GitHub — https://github.com/ajvirtualsolutionsph/phone-dialer (private)
- [x] Google Sheets remapped to existing spreadsheet (`1Zq7muXisE8QywVGXtRE6OqyDRl84UKWy37HoorjxO3s`)
- [x] Phone normalization added (US local format → E.164 automatically)
- [x] Added `call_status` (V) and `last_called` (W) columns to all 4 sheet tabs
- [x] `aging_days` column (U) preserved on all 4 tabs
- [x] Leads sidebar has 4 sheet tab buttons — defaults to "No Reply/Declined" on load
- [x] `getLeads(sheetName)` / `updateLead(..., sheetName)` — sheet-aware reads and writes
- [x] Dark mode UI — `#152238` navy palette, cyan `#38bdf8` accent, all components themed via `src/theme.js`
- [x] Live call transcription — Web Speech API captures agent's mic in real time; transcript pre-fills notes on hang-up
- [x] Status bar now shows accurate states: `initializing → ready → connecting → in-call → error`
- [x] Call button disabled until client ready; silent failure fixed with proper error display
- [x] SignalWire account topped up (trial removed) — can now call any US number
- [x] Switched to PSTN conference bridge — `POST /calls/initiate { to, agentPhone }` calls both agent + lead, bridges via LaML `<Conference>`
- [x] Agent phone field added to Dialer UI — saved to localStorage, required before Call button enables
- [x] Fixed call outcome form — was checking `status === 'idle'` (never fired), now correctly `status === 'ready'`
- [x] Hang up cancels both call legs simultaneously via `Promise.all`
- [x] Fixed `sheetName` not passed on call save — now uses `selectedLead.sheet`
- [x] Backend deployed to Render — https://phone-dialer-shl2.onrender.com
- [x] Frontend deployed to Vercel — https://phone-dialer-six.vercel.app
- [x] Fixed production API calls — axios `baseURL` set from `VITE_BACKEND_URL` (Vite proxy only works in dev)
- [x] CORS wired up — `FRONTEND_URL` set to Vercel URL in Render env vars
- [x] Supabase + Google Sheets logging verified end-to-end (session 5)
- [x] Switched to agent-calls-in architecture — SignalWire dials lead only; agent calls +12525303318 to join (bypasses PH international dialing block)
- [x] Backend auto-configures inbound webhook on startup via `RENDER_EXTERNAL_URL`
- [x] Removed "Your phone" field from UI — replaced with join-call banner showing +12525303318
- [x] **Conference bridge verified end-to-end** — two-way audio confirmed via +18005551212 test (session 5)
- [x] Moved dialer call notes from col J (existing notes) to new col X (`dialer_notes`) — col J no longer touched
- [x] `initDialerColumns()` added — writes `dialer_notes` header to X1 on all 4 tabs at backend startup
- [x] Grid expanded to 24 columns on all 4 sheet tabs (was 23/A–W)
- [x] GitHub repo made public — https://github.com/ajvirtualsolutionsph/phone-dialer (.env never committed, safe)
- [x] UptimeRobot monitor set up — pings `https://phone-dialer-shl2.onrender.com/health` every 5 min, keeps Render awake 24/7 (session 7)
- [x] Ring timeout added — `Timeout: '25'` on outbound call; auto-terminates if lead doesn't answer (session 8)
- [x] Answering Machine Detection — `MachineDetection: 'Enable'`; voicemail detected in 3–5s, auto-hung up (session 8)
- [x] `POST /calls/status-callback` — auto-logs No Answer / Busy / Voicemail / Failed to Supabase + Sheets; zero agent clicks (session 8)
- [x] `GET /calls/status` polling — frontend polls every 3s, shows toast and auto-advances to next lead on auto-terminated calls (session 8)
- [x] `callState` object replaces bare `activeConference` — tracks leadName, rowIndex, sheetName, disposition, startedAt for auto-logging (session 8)
- [x] Memory system built out — 6 memory files covering status, architecture decisions, agent workflow, deployment, future ideas (session 8)
- [x] **Ring timeout verified** — 25s auto-terminates, "No Answer" auto-logged to Supabase + Sheets, toast shown, dialer advances to next lead (session 9)
- [x] **Full real call verified** — two-way audio confirmed (Sawa Restaurant & Grill), live transcription captured, outcome form saved correctly (session 9)
- [x] Fixed `MachineDetectionTimeout` and `StatusCallbackEvent` params — not supported by SignalWire compat API (session 9)
- [x] Fixed `clearCallState` to preserve disposition so frontend polling can react to auto-terminated calls (session 9)
- [x] Added `machine_end_beep` to AMD voicemail detection check (session 9)
- [x] Fixed duplicate Supabase entries — "Save & next lead" button now disabled while saving (session 9)
- [x] Added "Clear" button to Recent Calls list — clears display for session, data stays in Supabase (session 9)
- [x] Wake-up ping on page load — `axios.get('/health')` fires silently on app load to warm Render before first call (session 10)
- [x] Increased `/calls/initiate` axios timeout to 30s — prevents ERR_TIMED_OUT on slow Render cold starts (session 10)
- [x] Full security audit completed — 4 critical, 6 warning, 16 minor issues identified (session 11)
- [x] `.env` confirmed never committed to git — no history purge needed (session 11)
- [x] `API_SECRET` added — all `/calls/*` and `/leads/*` endpoints now require `x-api-key` header; SignalWire webhooks exempted (session 11)
- [x] Helmet.js added — sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` and other security headers (session 11)
- [x] Rate limiting added — `POST /calls/initiate` capped at 20 requests/min per IP via `express-rate-limit` (session 11)
- [x] Webhook signature validation — HMAC-SHA1 verification on `/calls/inbound` and `/calls/status-callback` (production only) (session 11)
- [x] Phone number input validation — rejects malformed numbers before sending to SignalWire (session 11)
- [x] Env var startup check — backend exits immediately with clear error if any required env var is missing (session 11)
- [x] Fake mute button removed — was toggling UI state only; conference bridge has no browser audio to mute (session 11)
- [x] `VITE_API_SECRET` added to Vercel env vars, `API_SECRET` added to Render env vars — verified live via DevTools (session 11)

## Agent workflow (session 6)
- Agent joins calls by dialing **+12525303318** via **Viber Out** from their PH phone (Viber Out → US number, no UDP block)
- Best calling window: **9–11 PM PHT** = 9–11 AM US Eastern (prime business hours for East Coast leads)
- West Coast leads require midnight+ PHT — target East Coast first

### 🔲 Next Session
- [ ] **Test AMD** — call a number that goes to voicemail, confirm "Voicemail" logged within 5s and call hangs up (skipped session 9 — no voicemail number available)
- [ ] **Real dialing session** — work through actual leads, verify No Answer / Answered / Busy all log correctly at scale
- [ ] **Change UptimeRobot ping interval to 1 min** — reduces cold start risk (currently 5 min; do via UptimeRobot dashboard)
- [ ] **GitHub profile** — add repo descriptions, topics, and profile README (gh CLI not installed; do via GitHub web UI)
- [ ] **Optional**: when SignalWire support enables +63 dialing, agent can receive calls directly instead of dialing in
- [ ] **Remaining audit items** — race condition in global `callState` (low risk for single-agent use), Google Sheets API timeout, Supabase autoLog retry logic

### 🔲 Later
- [ ] Investigate WebRTC audio for browser-based calling (requires TURN relay or different ISP)
