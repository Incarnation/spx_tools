from __future__ import annotations

from pathlib import Path

from spx_backend.db import engine


async def init_db() -> None:
    schema_path = Path(__file__).with_name("db_schema.sql")
    sql = schema_path.read_text(encoding="utf-8")
    async with engine.begin() as conn:
        # Execute statement-by-statement (asyncpg won't reliably accept multi-statement executes).
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        for stmt in statements:
            await conn.exec_driver_sql(stmt)

