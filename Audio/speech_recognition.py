"""
Terminal-only speech recognition helper.

This module is intentionally not connected to the frontend. Run it from the
terminal to test microphone input.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass


@dataclass
class RecognitionResult:
    text: str
    language: str


def recognize_from_microphone(language: str = "en-IN", timeout: int = 5, phrase_time_limit: int = 10) -> RecognitionResult:
    try:
        import speech_recognition as sr
    except ImportError as exc:  # pragma: no cover - dependency is optional
        raise RuntimeError(
            "speech_recognition is not installed. Install it with `pip install SpeechRecognition pyaudio`."
        ) from exc

    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)

    text = recognizer.recognize_google(audio, language=language)
    return RecognitionResult(text=text, language=language)


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture speech from the microphone and print the transcript.")
    parser.add_argument("--language", default="en-IN", help="BCP-47 language code for recognition.")
    parser.add_argument("--timeout", type=int, default=5, help="Seconds to wait for speech to start.")
    parser.add_argument("--phrase-time-limit", type=int, default=10, help="Maximum seconds to capture a phrase.")
    args = parser.parse_args()

    try:
        result = recognize_from_microphone(args.language, args.timeout, args.phrase_time_limit)
    except Exception as exc:
        print(f"Error: {exc}")
        return 1

    print(result.text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
