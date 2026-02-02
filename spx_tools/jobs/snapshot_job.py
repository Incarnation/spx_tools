from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from loguru import logger
from sqlalchemy import text

from spx_tools.config import settings
from spx_tools.db import SessionLocal
from spx_tools.ingestion.tradier_client import TradierClient, get_tradier_client


def _checksum(payload: object) -> str:
    b = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(b).hexdigest()


def _parse_expirations(resp: dict) -> list[date]:
    # Tradier often returns { "expirations": { "date": ["2026-02-06", ...] } }
    dates = resp.get("expirations", {}).get("date", [])
    out: list[date] = []
    for d in dates:
        try:
            out.append(date.fromisoformat(d))
        except Exception:
            continue
    return sorted(out)


def _choose_expiration_for_dte(expirations: list[date], target_dte: int, now_et: datetime, tolerance: int = 1) -> date | None:
    # DTE computed in calendar days (good enough for the MVP).
    target_date = (now_et.date() + timedelta(days=target_dte))
    candidates = [e for e in expirations if abs((e - target_date).days) <= tolerance]
    if not candidates:
        return None
    return min(candidates, key=lambda e: abs((e - target_date).days))


def _is_rth(now_et: datetime) -> bool:
    # MVP: Monday-Friday 09:30-16:00 ET.
    if now_et.weekday() >= 5:
        return False
    t = now_et.time()
    return (t >= datetime.strptime("09:30", "%H:%M").time()) and (t <= datetime.strptime("16:00", "%H:%M").time())


@dataclass(frozen=True)
class SnapshotJob:
    tradier: TradierClient

    async def run_once(self) -> None:
        tz = ZoneInfo(settings.tz)
        now_et = datetime.now(tz=tz)

        if not _is_rth(now_et):
            logger.info("snapshot_job: outside RTH; skipping (now_et={})", now_et.isoformat())
            return

        underlying = settings.snapshot_underlying
        dte_targets = settings.dte_targets_list()

        exp_resp = await self.tradier.get_option_expirations(underlying)
        expirations = _parse_expirations(exp_resp)
        if not expirations:
            logger.warning("snapshot_job: no expirations returned for {}", underlying)
            return

        async with SessionLocal() as session:
            for target_dte in dte_targets:
                exp = _choose_expiration_for_dte(expirations, target_dte=target_dte, now_et=now_et)
                if exp is None:
                    logger.warning("snapshot_job: no expiration found for target_dte={} ({} expirations)", target_dte, len(expirations))
                    continue

                chain = await self.tradier.get_option_chain(underlying=underlying, expiration=exp.isoformat(), greeks=True)
                chk = _checksum(chain)

                await session.execute(
                    text(
                        """
                        INSERT INTO chain_snapshots (ts, underlying, target_dte, expiration, payload_json, checksum)
                        VALUES (:ts, :underlying, :target_dte, :expiration, CAST(:payload AS jsonb), :checksum)
                        """
                    ),
                    {
                        "ts": now_et.astimezone(ZoneInfo("UTC")),
                        "underlying": underlying,
                        "target_dte": target_dte,
                        "expiration": exp,
                        "payload": json.dumps(chain, default=str),
                        "checksum": chk,
                    },
                )

            await session.commit()


def build_snapshot_job() -> SnapshotJob:
    return SnapshotJob(tradier=get_tradier_client())

