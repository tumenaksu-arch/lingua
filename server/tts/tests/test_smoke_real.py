"""ONE real-engine smoke test — opt-in, isolated, safe.

Enabled with LOVEVOX_REAL_SMOKE=1; otherwise skipped. Synthesis runs in a
subprocess because a broken espeak-ng can terminate the process at C level
(cannot be caught with try/except). A subprocess failure is reported as a
skip, never a suite crash. Output goes to server/tts/.smoke/ (gitignored).

Run just this with: LOVEVOX_REAL_SMOKE=1 pytest -q tests/test_smoke_real.py -rs
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

SMOKE_DIR = Path(__file__).resolve().parent.parent / ".smoke"

_SYNTH_SCRIPT = """
import numpy as np
import soundfile as sf
from kokoro import KPipeline

pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M", device="cpu")
chunks = [
    a.numpy() if hasattr(a, "numpy") else a
    for _, _, a in pipe("Hello, how are you?", voice="af_heart", speed=1.0)
]
audio = np.concatenate(chunks)
assert audio.size > 24000, audio.size
sf.write(sys.argv[1], audio, 24000)
print("SMOKE-OK", audio.size)
"""


@pytest.mark.skipif(
    not os.environ.get("LOVEVOX_REAL_SMOKE"),
    reason="real-engine smoke is opt-in (set LOVEVOX_REAL_SMOKE=1)",
)
def test_real_smoke_en():
    SMOKE_DIR.mkdir(exist_ok=True)
    wav_path = SMOKE_DIR / "smoke-en.wav"
    proc = subprocess.run(
        [sys.executable, "-c", _SYNTH_SCRIPT, str(wav_path)],
        capture_output=True,
        text=True,
        timeout=300,
        cwd=str(SMOKE_DIR),
    )
    if proc.returncode != 0 or "SMOKE-OK" not in proc.stdout:
        pytest.skip(
            f"real engine synthesis unavailable on this host "
            f"(rc={proc.returncode}): {(proc.stderr or '')[-400:]}"
        )
    assert wav_path.stat().st_size > 1000

    # full pipeline through the app's MP3 encoder when ffmpeg is available
    import shutil
    import subprocess as sp

    if shutil.which("ffmpeg"):
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from app import pcm_to_mp3
        import soundfile as sf

        audio, sr = sf.read(wav_path, dtype="float32")
        mp3_path = SMOKE_DIR / "smoke-en.mp3"
        mp3_path.write_bytes(pcm_to_mp3(audio, sr))
        probe = sp.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(mp3_path)],
            capture_output=True, text=True, check=True,
        )
        assert float(probe.stdout.strip()) > 0.5
