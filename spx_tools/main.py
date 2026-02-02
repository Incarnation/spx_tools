from __future__ import annotations

import asyncio

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger

from spx_tools.config import settings
from spx_tools.db_init import init_db
from spx_tools.jobs.snapshot_job import build_snapshot_job
from spx_tools.web.app import app


async def _run_startup() -> None:
    await init_db()

    scheduler = AsyncIOScheduler(timezone=settings.tz)
    job = build_snapshot_job()

    scheduler.add_job(job.run_once, "interval", minutes=settings.snapshot_interval_minutes, id="snapshot_job", replace_existing=True)
    scheduler.start()

    logger.info("scheduler started interval={}m", settings.snapshot_interval_minutes)

    # Run one immediately on boot (useful for confirming wiring).
    try:
        await job.run_once()
    except Exception:
        logger.exception("snapshot_job initial run failed")


@app.on_event("startup")
async def on_startup() -> None:
    await _run_startup()


def main() -> None:
    import uvicorn

    uvicorn.run("spx_tools.web.app:app", host="0.0.0.0", port=8000, log_level=settings.log_level.lower())


if __name__ == "__main__":
    main()

