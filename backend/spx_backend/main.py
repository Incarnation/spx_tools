from __future__ import annotations

from spx_backend.config import settings


def main() -> None:
    import uvicorn

    uvicorn.run("spx_backend.web.app:app", host="0.0.0.0", port=8000, log_level=settings.log_level.lower())


if __name__ == "__main__":
    main()

