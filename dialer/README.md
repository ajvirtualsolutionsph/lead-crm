# PH-to-US Dialer

Browser-based softphone that calls US numbers from the Philippines via SignalWire WebRTC. Leads come from Google Sheets; call outcomes are written back automatically.

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

Open `http://localhost:5173` and allow microphone access when prompted.

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

- **Backend → Render**: push `backend/` folder, add env vars in the Render dashboard, set the SignalWire TwiML webhook to `https://<your-render-url>/twiml`.
- **Frontend → Vercel**: update `frontend/vercel.json` with your Render URL, push, deploy with `vercel --prod`.
