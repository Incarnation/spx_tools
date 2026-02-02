## spx_tools

MVP scaffolding for the SPX options platform:
- FastAPI app (health + basic snapshot list)
- Postgres schema initialization at startup
- 5-minute Tradier chain snapshot job (RTH only)

### Local run
1) Create a virtualenv and install deps:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Create `.env` from `.env.example` and set:
- `DATABASE_URL`
- `TRADIER_ACCESS_TOKEN`
- `TRADIER_ACCOUNT_ID`

3) Run:

```bash
python -m spx_tools.main
```

Open:
- `http://localhost:8000/`
- `http://localhost:8000/health`

### Notes
- The snapshot job currently stores raw chain JSON in `chain_snapshots.payload_json`.
- Next steps: add decision engine, paper order placement, and UI pages for decisions/orders/trades.

