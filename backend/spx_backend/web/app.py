from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from spx_backend.config import settings
from spx_backend.db import get_db_session
from spx_backend.db_init import init_db
from spx_backend.ingestion.tradier_client import get_tradier_client
from spx_backend.jobs.snapshot_job import _parse_expirations, build_snapshot_job


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema and start scheduler.
    await init_db()

    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler = AsyncIOScheduler(timezone=settings.tz)
    job = build_snapshot_job()
    scheduler.add_job(
        job.run_once,
        "interval",
        minutes=settings.snapshot_interval_minutes,
        id="snapshot_job",
        replace_existing=True,
    )
    scheduler.start()
    app.state.scheduler = scheduler

    # Run one immediately on boot (useful for confirming wiring).
    try:
        await job.run_once()
    except Exception:
        # Don't crash the web app if the first snapshot fails.
        pass

    yield

    # Graceful shutdown.
    try:
        scheduler.shutdown(wait=False)
    except Exception:
        pass


app = FastAPI(title="SPX Tools (Backend)", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/chain-snapshots")
async def list_chain_snapshots(limit: int = 50, db: AsyncSession = Depends(get_db_session)) -> dict:
    limit = max(1, min(limit, 500))
    r = await db.execute(
        text(
            """
            SELECT snapshot_id, ts, underlying, target_dte, expiration, checksum
            FROM chain_snapshots
            ORDER BY ts DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    )
    rows = r.fetchall()
    return {
        "items": [
            {
                "snapshot_id": row.snapshot_id,
                "ts": row.ts.isoformat(),
                "underlying": row.underlying,
                "target_dte": row.target_dte,
                "expiration": str(row.expiration),
                "checksum": row.checksum,
            }
            for row in rows
        ]
    }


def _require_admin(x_api_key: str | None = Header(default=None)) -> None:
    # If ADMIN_API_KEY is not set, allow local/dev usage without auth.
    if settings.admin_api_key:
        if not x_api_key or x_api_key != settings.admin_api_key:
            raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/api/admin/run-snapshot")
async def admin_run_snapshot(_: None = Depends(_require_admin)) -> dict:
    # Force run once even outside RTH (useful for testing).
    job = build_snapshot_job()
    result = await job.run_once(force=True)
    return result


@app.get("/api/admin/expirations")
async def admin_list_expirations(symbol: str = "SPX", _: None = Depends(_require_admin)) -> dict:
    client = get_tradier_client()
    resp = await client.get_option_expirations(symbol)
    exps = _parse_expirations(resp)
    return {"symbol": symbol, "expirations": [e.isoformat() for e in exps]}


@app.get("/", response_class=HTMLResponse)
async def home(db: AsyncSession = Depends(get_db_session)) -> HTMLResponse:
    r = await db.execute(
        text(
            """
            SELECT snapshot_id, ts, underlying, target_dte, expiration
            FROM chain_snapshots
            ORDER BY ts DESC
            LIMIT 20
            """
        )
    )
    rows = r.fetchall()
    items = "\n".join(
        f"<li>#{row.snapshot_id} {row.ts} {row.underlying} dte={row.target_dte} exp={row.expiration}</li>"
        for row in rows
    )
    html = f"""
    <html>
      <head><title>SPX Tools (Backend)</title></head>
      <body style="font-family: system-ui; max-width: 900px; margin: 40px auto;">
        <h2>SPX Tools (Backend)</h2>
        <p>Server time: {datetime.utcnow().isoformat()}Z</p>
        <h3>Latest chain snapshots</h3>
        <ol>{items}</ol>
        <p><a href="/health">/health</a> · <a href="/api/chain-snapshots">/api/chain-snapshots</a></p>
      </body>
    </html>
    """
    return HTMLResponse(html)

