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
- Call flow: `POST /api/calls/initiate { to }` → backend dials lead only → lead hears hold music → agent dials +12525303318 from their phone → both bridged
- Lead TwiML: `<Conference startConferenceOnEnter="false" endConferenceOnExit="true">` — lead hears hold music until agent joins
- Agent TwiML: `<Conference startConferenceOnEnter="true" endConferenceOnExit="true">` — served via `POST /calls/inbound` webhook when agent calls in
- Hang up: `POST /api/calls/hangup { callSid: leadCallSid }` — clears activeConference state
- Status starts `'ready'` immediately on page load
- No "Your phone" field — agent always dials +12525303318 to join
- `activeConference` stored in memory on backend — single-agent dialer, one call at a time
- Backend auto-configures SignalWire inbound webhook on startup via `RENDER_EXTERNAL_URL`
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

### 🔲 Next Session
- [ ] **Test with a real lead** — click a lead from the sidebar, click Call, dial +12525303318 to join, verify two-way conversation
- [ ] **Log a completed real call** — fill outcome form, verify Supabase row + Google Sheet cols V/W/X update
- [ ] **Optional**: when SignalWire support enables +63 dialing, agent can receive calls directly instead of dialing in

### 🔲 Later
- [ ] Investigate WebRTC audio for browser-based calling (requires TURN relay or different ISP)
