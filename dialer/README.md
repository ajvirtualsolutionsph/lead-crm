# Lead CRM

Cold calling CRM for AJ Virtual Solutions. Agent browses leads from Google Sheets, calls directly via Viber Out, then logs outcomes and notes back to Sheets and Supabase.

## Quick start

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # fill in your credentials
npm install
npm run dev            # nodemon, hot-reload on port 3001

# Terminal 2 — frontend
cd frontend
cp .env.example .env
npm install
npm run dev            # Vite dev server at http://localhost:5173
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example`.

## Supabase table

Run this SQL in your Supabase project's SQL editor once:

```sql
create table calls (
  id uuid primary key default gen_random_uuid(),
  lead_name text,
  phone text not null,
  duration_seconds integer,
  status text,
  notes text,
  called_at timestamptz default now()
);
```

## Deployment

- **Backend → Render**: push `backend/` folder, add env vars in the Render dashboard.
- **Frontend → Vercel**: push `frontend/` folder, add env vars in the Vercel dashboard.
