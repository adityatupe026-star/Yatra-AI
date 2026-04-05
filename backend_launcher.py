from __future__ import annotations

import logging
import os
import pathlib
import sys
import traceback


ROOT = pathlib.Path(__file__).resolve().parent
STDOUT_LOG = ROOT / "backend.out.log"
STDERR_LOG = ROOT / "backend.err.log"


def _write(path: pathlib.Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def _load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> int:
    _write(STDOUT_LOG, f"Launching backend from {ROOT}\nPython: {sys.executable}\n")
    try:
        _load_env_file()
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s: %(message)s",
            handlers=[
                logging.FileHandler(STDOUT_LOG, encoding="utf-8"),
                logging.FileHandler(STDERR_LOG, encoding="utf-8"),
            ],
        )
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
