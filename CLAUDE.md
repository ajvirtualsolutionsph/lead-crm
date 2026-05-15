# AJ Virtual Solutions CRM

Lead management CRM for cold calling US businesses from the Philippines. Agent calls leads directly via Viber Out. Google Sheets for leads, Supabase for call logging.

## Stack
- Backend: Node.js + Express (ES modules), port 3001 — deploy to Render
- Frontend: React + Vite, port 5173 — deploy to Vercel
- Leads: Google Sheets API v4
- Call log: Supabase (Postgres)
- Calls: Agent dials leads directly via **Viber Out** (no telephony SDK in the app)

## Structure
```
dialer/
├── backend/
│   ├── index.js
│   ├── routes/       leads.js, calls.js
│   ├── lib/          sheets.js, supabase.js
│   └── .env          ← never commit
└── frontend/
    └── src/
        ├── components/   LeadsSidebar.jsx, NotesPanel.jsx, CallLog.jsx, StatusBar.jsx
        └── hooks/        useLeads.js
```

## Workflow
1. Select a lead in the CRM → view their details
2. Call them directly via Viber Out (app is not involved in the call itself)
3. After the call, select outcome + add notes in the app
4. Click **Save & Next** → logs to Supabase + updates Google Sheets (cols V, W, X)

## Why SignalWire was removed (session 20)
- Agent has Viber Out subscription → can call US numbers directly from Philippines
- The old conference bridge (agent dials +12525303318 to join) was double work
- SignalWire blocks +63 dialing, WebRTC blocked by PH ISP — bridge was the only option, now irrelevant
- AMD / auto-voicemail detection removed; dispositions logged manually via outcome form

## UI Layout (session 20)
Three-column layout:
- **Col 1 — Leads** (280px): sheet tabs, search, lead list with status badges
- **Col 2 — Notes + Details** (flex): notes textarea (auto-save) → editable lead detail fields → website iframe
- **Col 3 — Call Log** (270px): outcome dropdown + Save & Next + recent calls list

Notes auto-save to Google Sheets col X (1.5s debounce). Lead detail fields (business, phone, email, category, address, hours) are editable inputs — save on blur via `PATCH /leads/:rowIndex/info`. Website field is also editable. Selecting a lead loads their saved notes and populates all fields.

## Backend .env
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=             # Ready for Call spreadsheet (dedicated dialer sheet)
LEAD_GEN_SHEET_ID=           # Lead Gen Pipeline spreadsheet (source for auto-sync)
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=3001
FRONTEND_URL=http://localhost:5173
API_SECRET=                  # shared secret — must match VITE_API_SECRET in frontend
```

## Frontend .env
```
VITE_BACKEND_URL=http://localhost:3001
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

`getLeads(sheetName)` reads `'Ready for Call'!A:X`. `updateLead(rowIndex, status, notes, sheetName)` writes V, W, X. `updateDialerNotes(rowIndex, notes, sheetName)` writes X only (auto-save). `updateLeadField(rowIndex, field, value, sheetName)` writes any single col A–H (editable CRM fields). `syncFromLeadGen()` pulls "Ready for Call" tab rows (A:U) from Lead Gen Pipeline, deduplicates by phone OR business name against **all dialer tabs** (prevents re-adding archived leads), appends to dialer sheet.

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
PATCH /leads/:rowIndex/notes         — update notes only (auto-save, col X)
PATCH /leads/:rowIndex/info          — update any editable lead field (cols A–H)
POST /leads/sync                     — pull new leads from Lead Gen Pipeline (dedup by phone OR name across all tabs)
POST /leads/archive-no-answer        — move No Answer leads from Ready for Call → Second Attempt
GET  /calls                          — recent calls from Supabase
POST /calls                          — log a completed call to Supabase + Sheets (cols V, W, X)
```

## Security
- `x-api-key` header required on all `/calls/*` and `/leads/*` routes
- Helmet.js security headers
- Env var startup check — backend exits if Google/Supabase vars are missing

## Deployment
- Backend: https://phone-dialer-shl2.onrender.com (Render, free tier)
- Frontend: https://phone-dialer-six.vercel.app (Vercel)
- UptimeRobot: pings `/health` every 5 min to keep Render awake

## Agent workflow
- Agent dials leads directly from **Viber Out** (uses their Viber Out subscription to call US numbers)
- Best window: **9–11 PM PHT** = 9–11 AM US Eastern (East Coast leads first)
- West Coast leads require midnight+ PHT
- After each call: select outcome in CRM → add notes → Save & Next

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

## Session 19 — Notes editing fix (2026-05-14)
- Fixed bug where transcript auto-populated from call overwrote manually typed notes after call ended
- Changed `setNotes(body)` to `setNotes(prev => prev ? \`${prev}\n\n--- Transcript ---\n${body}\` : body)` — now appends transcript below existing notes instead of replacing
- Notes are always editable before and after a call; existing dialer_notes load correctly when selecting any lead
- **Files changed:** `dialer/frontend/src/App.jsx`

## Session 20 — Remove SignalWire, convert to CRM (2026-05-15)
- Removed SignalWire entirely — agent now calls leads directly via Viber Out
- Removed: `useSignalWire.js`, `Dialer.jsx`, all call-lifecycle backend routes (initiate, hangup, status, inbound, status-callback, callState)
- Added: `PATCH /leads/:rowIndex/info` + `updateLeadField()` — editable lead detail fields in UI
- UI: Col 3 is now a Call Log panel (outcome select + Save & Next + recent calls); Col 2 NotesPanel has editable lead details with auto-save on blur
- Sync fix: dedup now checks ALL dialer tabs (not just Ready for Call) so archived leads don't get re-synced
- Duplicate fix: removed 10 leads from Ready for Call that were already in Second Attempt
- **Files changed:** `backend/routes/calls.js`, `backend/routes/leads.js`, `backend/lib/sheets.js`, `backend/index.js`, `frontend/src/App.jsx`, `frontend/src/components/NotesPanel.jsx`, `frontend/src/components/CallLog.jsx`, `frontend/src/components/StatusBar.jsx`

## Next
- [ ] **Test editable lead fields** — edit a field, verify it saves to Google Sheets
- [ ] **Test Save & Next** — log a call, confirm it appears in Supabase + Sheets cols V/W/X
- [ ] **Real calling session** — work through leads at scale with new workflow
- [ ] **Change UptimeRobot to 1-min interval** — via UptimeRobot dashboard (currently 5 min)
- [ ] **GitHub profile** — add repo descriptions, topics, README (via GitHub web UI)
- [ ] **Phase 2 CRM** — per-lead call history view, status filter, better lead browsing
