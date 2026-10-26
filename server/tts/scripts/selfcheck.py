#!/usr/bin/env python3
"""Build-time offline self-check (fails the Docker build on any missing asset).

Runs with HF_HUB_OFFLINE=1 after download_models.py: loads both engines exactly
like the app does and synthesizes one short sentence per language (all five).
If any model/voice/lazy resource is missing from the image, this exits nonzero
and the build fails instead of serving 500s at runtime.
"""

from __future__ import annotations

import os
import sys

# Fail loudly if we are somehow still online-dependent at build time.
os.environ["HF_HUB_OFFLINE"] = "1"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SENTENCES = {
    "en": "Hello, how are you?",
    "de": "Hallo, wie geht es dir?",
    "es": "¿Hola, cómo estás?",
    "fr": "Bonjour, comment ça va ?",
    "it": "Ciao, come stai?",
}


def main() -> int:
    from engines import Engines

    eng = Engines()
    eng.load()
    for lang, sentence in SENTENCES.items():
        pcm, sr = eng.synth(lang, sentence, 1.0)
        if len(pcm) == 0 or sr <= 0:
            print(f"SELF-CHECK FAILED: lang={lang} produced empty audio", flush=True)
            return 1
        print(f"self-check ok lang={lang} samples={len(pcm)} sr={sr}", flush=True)
    print("self-check passed: all five languages synthesize offline", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
