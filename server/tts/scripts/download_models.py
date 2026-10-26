#!/usr/bin/env python3
"""Build-time model download (runs inside the Docker build only).

Downloads:
  - Piper voice de_DE-thorsten-high (.onnx + .onnx.json) into PIPER_VOICE_DIR
  - Kokoro-82M weights for lang codes a/e/f/i (en/es/fr/it) into the HF cache

At runtime HF_HUB_OFFLINE=1 is set, so nothing is fetched live.
"""

import os
import urllib.request
from pathlib import Path

PIPER_VOICE = "de_DE-thorsten-high"
PIPER_BASE_URL = (
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/"
    "de/de_DE/thorsten/high"
)
KOKORO_CODES = ("a", "e", "f", "i")  # en, es, fr, it
KOKORO_REPO = "hexgrad/Kokoro-82M"


def main() -> None:
    out_dir = Path(os.environ.get("PIPER_VOICE_DIR", "/models/piper"))
    out_dir.mkdir(parents=True, exist_ok=True)
    for suffix in (".onnx", ".onnx.json"):
        dest = out_dir / f"{PIPER_VOICE}{suffix}"
        if dest.exists():
            print(f"already present: {dest}", flush=True)
            continue
        url = f"{PIPER_BASE_URL}/{PIPER_VOICE}{suffix}"
        print(f"downloading {url} -> {dest}", flush=True)
        urllib.request.urlretrieve(url, dest)

    from kokoro import KPipeline  # noqa: PLC0415 -- heavy import, build-time only

    for code in KOKORO_CODES:
        print(f"fetching Kokoro-82M weights lang_code={code}", flush=True)
        KPipeline(lang_code=code, repo_id=KOKORO_REPO, device="cpu")
    print("model download complete", flush=True)


if __name__ == "__main__":
    main()
