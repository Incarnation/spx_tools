from __future__ import annotations

from pathlib import Path

from sqlalchemy import text

from spx_tools.db import engine


async def init_db() -> None:
    schema_path = Path(__file__).with_name("db_schema.sql")
    sql = schema_path.read_text(encoding="utf-8")
    async with engine.begin() as conn:
        # Split on semicolons is brittle; execute full script in one go for Postgres.
        await conn.execute(text(sql))

