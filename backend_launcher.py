from __future__ import annotations

import pathlib
import sys
import traceback


ROOT = pathlib.Path(__file__).resolve().parent
STDOUT_LOG = ROOT / "backend.out.log"
STDERR_LOG = ROOT / "backend.err.log"


def _write(path: pathlib.Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def main() -> int:
    _write(STDOUT_LOG, f"Launching backend from {ROOT}\nPython: {sys.executable}\n")
    try:
        import uvicorn

        config = uvicorn.Config(
            "YatraAI.api.app:app",
            host="127.0.0.1",
            port=8001,
            log_level="info",
            access_log=False,
            reload=False,
        )
        server = uvicorn.Server(config)
        server.run()
        return 0 if server.started else 1
    except Exception:
        _write(STDERR_LOG, traceback.format_exc())
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
