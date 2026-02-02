## SPX Tools

A research + paper execution platform for **SPX index options** with a focus on **0–14 DTE credit spreads**.

Current MVP capabilities:
- **Backend**: FastAPI service that initializes a Postgres schema on startup and runs a scheduled job to snapshot the SPX option chain from Tradier.
- **Frontend**: React (Vite) dashboard that reads from the backend API.

Planned next steps (per `PROJECT_SPEC.md`):
- Entry logic (3/5/7 DTE, 10/11/12 ET), trade decision tracking, and Tradier sandbox multi-leg order placement.
- Backtesting pipeline (Databento `OPRA.PILLAR` SPX, `CBBO-1m`) with live/backtest parity.

---

## Repo layout
- `backend/`
  - `spx_backend/`: FastAPI app + scheduler + DB code
  - `requirements.txt`: backend Python dependencies
- `frontend/`
  - Vite + React dashboard

---

## Configuration

Create a `.env` in the repo root (copy `.env.example`) and fill in:
- **`DATABASE_URL`**: Postgres connection string for SQLAlchemy async
  - format: `postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DBNAME`
- **`TRADIER_BASE_URL`**: default `https://sandbox.tradier.com/v1` (paper)
- **`TRADIER_ACCESS_TOKEN`**: your Tradier access token
- **`TRADIER_ACCOUNT_ID`**: your paper account id (e.g. `VAxxxxxx`)
- Optional:
  - `SNAPSHOT_INTERVAL_MINUTES` (default 5)
  - `SNAPSHOT_UNDERLYING` (default SPX)
  - `SNAPSHOT_DTE_TARGETS` (default `3,5,7`)
  - `CORS_ORIGINS` (default `http://localhost:5173`)

---

## Database setup

### Recommended: Railway Postgres (cloud)
Use Railway Postgres for anything you want running 24/7 (snapshots, paper orders, dashboard history).

1) Create/add a Postgres service in Railway.
2) Copy the Postgres connection string from Railway.
3) Set `.env`:
- If Railway gives you `postgresql://...`, convert it to:
  - `postgresql+asyncpg://...`

The backend auto-creates required tables on startup from:
- `backend/spx_backend/db_schema.sql`

### Alternative: local Postgres (development)
If you prefer local DB for dev, you can run Postgres via Docker:

```bash
docker run --name spx-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=spx_tools -p 5432:5432 -d postgres:16
```

Then set:
- `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/spx_tools`

---

## Running locally

### Backend (FastAPI + scheduler)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd backend
python -m spx_backend.main
```

Backend endpoints:
- `GET http://localhost:8000/health`
- `GET http://localhost:8000/api/chain-snapshots?limit=50`

Notes:
- The snapshot job runs **during regular market hours only** and stores raw chain JSON into `chain_snapshots.payload_json`.

### Frontend (React)
In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:
- `http://localhost:5173/`

The Vite dev server proxies `/api/*` to the backend on `http://localhost:8000`.

---

## Deployment (Railway)

### Backend
This repo includes a `Dockerfile` that starts the backend. Typical Railway setup:
- Create a service from this repo
- Set environment variables (same as `.env`)
- Ensure a Postgres plugin/service is attached and `DATABASE_URL` is set appropriately

### Frontend
Two options:
- **Separate service**: deploy `frontend/` as a static site (recommended when you want CDN/static hosting).
- **Single service**: later we can configure the backend to serve the built React assets (good for “one container” simplicity).

---

## Troubleshooting

### “No snapshots yet”
- The scheduler skips outside RTH.
- Also verify Tradier token/permissions and that the underlying symbol (`SPX`) is supported in your account.

### Postgres schema errors on boot
- The schema is executed statement-by-statement in `backend/spx_backend/db_init.py`.
- If you manually created tables earlier, you may need one-time migrations (we’ll add Alembic once the schema stabilizes).

### Railway DB SSL issues
If you see SSL errors connecting to Railway Postgres, paste the error message and we’ll add the correct asyncpg SSL settings.


