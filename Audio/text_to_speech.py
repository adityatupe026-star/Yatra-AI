"""
Terminal-only text-to-speech helper.

This module is intentionally not connected to the frontend. Run it from the
terminal to test spoken playback.
"""

from __future__ import annotations

import argparse


def speak_text(text: str, rate: int = 180, volume: float = 1.0) -> None:
    try:
        import pyttsx3
    except ImportError as exc:  # pragma: no cover - dependency is optional
        raise RuntimeError("pyttsx3 is not installed. Install it with `pip install pyttsx3`.") from exc

    engine = pyttsx3.init()
    engine.setProperty("rate", rate)
    engine.setProperty("volume", max(0.0, min(volume, 1.0)))
    engine.say(text)
    engine.runAndWait()


def main() -> int:
    parser = argparse.ArgumentParser(description="Read text aloud using text-to-speech.")
    parser.add_argument("text", help="Text to speak.")
    parser.add_argument("--rate", type=int, default=180, help="Speech rate.")
    parser.add_argument("--volume", type=float, default=1.0, help="Volume from 0.0 to 1.0.")
    args = parser.parse_args()

    try:
        speak_text(args.text, args.rate, args.volume)
    except Exception as exc:
        print(f"Error: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
