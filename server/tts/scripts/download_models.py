#!/usr/bin/env python3
"""Build-time model download (runs inside the Docker build only).

Downloads AND warms:
  - Piper voice de_DE-thorsten-high (.onnx + .onnx.json) into PIPER_VOICE_DIR
  - Kokoro-82M weights for lang codes a/e/f/i (en/es/fr/it) into the HF cache
  - Kokoro voice packs: voices/af_heart.pt, ef_dora.pt, ff_siwis.pt, if_sara.pt
  - Every resource the pipelines lazily fetch at first synthesis
    (misaki/espeak/spaCy data): one short sentence is synthesized per
    Kokoro language while the network is still available.

At runtime HF_HUB_OFFLINE=1 is set, so nothing is fetched live; the build-time
self-check (scripts/selfcheck.py) proves that by synthesizing offline.
"""

import os
import urllib.request
from pathlib import Path

PIPER_VOICE = "de_DE-thorsten-high"
PIPER_BASE_URL = (
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/"
    "de/de_DE/thorsten/high"
)
# lang -> (kokoro lang_code, voice, one warm-up sentence)
KOKORO_LANGS = {
    "en": ("a", "af_heart", "Hello, how are you?"),
    "es": ("e", "ef_dora", "¿Hola, cómo estás?"),
    "fr": ("f", "ff_siwis", "Bonjour, comment ça va ?"),
    "it": ("i", "if_sara", "Ciao, come stai?"),
}
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

    for lang, (code, voice, sentence) in KOKORO_LANGS.items():
        print(f"fetching Kokoro-82M weights lang_code={code} ({lang})", flush=True)
        pipe = KPipeline(lang_code=code, repo_id=KOKORO_REPO, device="cpu")
        print(f"fetching Kokoro voice={voice} ({lang})", flush=True)
        pipe.load_single_voice(voice)
        # Warm every lazy resource (misaki/espeak/spaCy data) for this lang.
        print(f"warming pipeline lang={lang}", flush=True)
        for _gs, _ps, _audio in pipe(sentence, voice=voice, speed=1.0):
            pass
    print("model download complete", flush=True)


if __name__ == "__main__":
    main()
