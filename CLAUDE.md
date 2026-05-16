# Lead CRM — AJ Virtual Solutions

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
4. Click **Save & Next** → logs to Supabase + updates Google Sheets (cols V, W)

## UI Layout
Three-column layout:
- **Col 1 — Leads** (280px): sheet tabs (Ready for Call / Second Attempt / Rejects), search, lead list with status badges
- **Col 2 — Notes + Details** (flex): notes textarea (auto-save, 180px) → editable lead detail fields → cold calling script accordion → website Open ↗ button
- **Col 3 — Call Log** (270px): outcome dropdown + Save & Next + Move to Second Attempt + Move to Rejects + recent calls list

Notes auto-save to Google Sheets col W (1.5s debounce). Lead detail fields (business, phone, email, category, address, hours) are editable inputs — save on blur via `PATCH /leads/:rowIndex/info`. Cold calling script sections are editable per-section (Edit button), saved to localStorage, resettable to default.

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
- **Ready for Call** (`GOOGLE_SHEET_ID`) — dedicated dialer sheet (ID: `11-QP3JSPd2KS-8zWP4az1ZTR-qRSx4fciRVbYaZucnk`); three tabs: Ready for Call, Second Attempt, Rejects

**Sheet column layout (A–W):**

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
| W | dialer_notes | editable CRM notes; auto-saved by dialer — WRITE |

`getLeads(sheetName)` reads `A:W`. `updateLead(rowIndex, status, notes, sheetName)` writes V and W. `updateDialerNotes(rowIndex, notes, sheetName)` writes W only (auto-save). `updateLeadField(rowIndex, field, value, sheetName)` writes any single col A–H (editable CRM fields). `syncFromLeadGen()` pulls "Ready for Call" tab rows (A:U) from Lead Gen Pipeline, deduplicates by phone OR business name against **all dialer tabs** (prevents re-adding archived leads), appends to dialer sheet. `moveLeadToTab(rowIndex, sheetName, targetTab)` is a generic helper used by move-to-second and move-to-rejects.

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
PATCH /leads/:rowIndex               — update status + notes (post-call); writes cols V, W
PATCH /leads/:rowIndex/notes         — update notes only (auto-save, col W)
PATCH /leads/:rowIndex/info          — update any editable lead field (cols A–H)
POST /leads/sync                     — pull new leads from Lead Gen Pipeline (dedup by phone OR name across all tabs)
POST /leads/archive-no-answer        — move No Answer leads from Ready for Call → Second Attempt
POST /leads/move-to-second           — move any lead → Second Attempt tab
POST /leads/move-to-rejects          — move any lead → Rejects tab
GET  /calls                          — recent calls from Supabase
POST /calls                          — log a completed call to Supabase + Sheets (cols V, W)
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

## Key architecture decisions
- No WebRTC / no telephony SDK — agent calls via Viber Out; app only logs outcomes
- Three sheet tabs: Ready for Call → Second Attempt → Rejects (archive tiers)
- Sync dedup checks all tabs — prevents re-adding leads already archived
- Col W = CRM Notes (dialer writes); col X retired (was dialer_notes pre-session 21)
- Cold calling script editable per-section via localStorage (no backend needed)

## Next
- [ ] **Real calling session** — work through leads at scale with new workflow
- [ ] **Test Save & Next** — log a call, confirm it appears in Supabase + col W
- [ ] **Change UptimeRobot to 1-min interval** — via UptimeRobot dashboard (currently 5 min)
- [ ] **GitHub profile** — add repo descriptions, topics, README (via GitHub web UI)
- [ ] **Phase 2 CRM** — per-lead call history view, status filter, better lead browsing
