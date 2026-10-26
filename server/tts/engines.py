"""TTS engine wrapper: Kokoro-82M (en/es/fr/it) + Piper (de).

Heavy imports (torch, kokoro, piper) happen lazily inside load() so that the
module imports fast and tests can run without the engines installed.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import numpy as np

_LOGGER = logging.getLogger("lovevox.tts.engines")

KOKORO_REPO = "hexgrad/Kokoro-82M"

# lang -> (kokoro lang_code, voice)
KOKORO_VOICES: dict[str, tuple[str, str]] = {
    "en": ("a", "af_heart"),
    "es": ("e", "ef_dora"),
    "fr": ("f", "ff_siwis"),
    "it": ("i", "if_sara"),
}

PIPER_LANG = "de"
PIPER_VOICE = "de_DE-thorsten-high"

PIPER_VOICE_DIR = os.environ.get("PIPER_VOICE_DIR", "/models/piper")


class EngineError(RuntimeError):
    """Synthesis failed inside an engine."""


@dataclass(frozen=True)
class EngineSpec:
    engine: str  # "kokoro" | "piper"
    voice: str


def spec_for_lang(lang: str) -> EngineSpec:
    if lang == PIPER_LANG:
        return EngineSpec(engine="piper", voice=PIPER_VOICE)
    code, voice = KOKORO_VOICES[lang]
    return EngineSpec(engine="kokoro", voice=voice)


class Engines:
    """Loads and wraps both TTS engines. Not thread-safe during load();
    afterwards synth() may be called concurrently from worker threads."""

    def __init__(self, voice_dir: str = PIPER_VOICE_DIR, threads: int = 4) -> None:
        self._voice_dir = voice_dir
        self._threads = threads
        self._kokoro_pipes: dict[str, object] = {}
        self._piper_voice: object | None = None
        self._loaded = False

    # -- lifecycle ---------------------------------------------------------

    def load(self) -> None:
        """Blocking full load. Downloads nothing at runtime (models must be
        present locally / in the HF cache; HF_HUB_OFFLINE=1 at runtime)."""
        import torch  # noqa: F401 -- ensures torch is importable before we commit

        torch.set_num_threads(self._threads)
        from kokoro import KPipeline

        for lang, (code, _voice) in KOKORO_VOICES.items():
            _LOGGER.info("loading kokoro pipeline lang=%s code=%s", lang, code)
            self._kokoro_pipes[lang] = KPipeline(
                lang_code=code, repo_id=KOKORO_REPO, device="cpu"
            )
        from piper import SynthesisConfig, PiperVoice  # noqa: F401

        model_path = os.path.join(self._voice_dir, f"{PIPER_VOICE}.onnx")
        _LOGGER.info("loading piper voice=%s from %s", PIPER_VOICE, model_path)
        self._piper_voice = PiperVoice.load(model_path)
        self._loaded = True
        _LOGGER.info("engines loaded")

    @property
    def loaded(self) -> bool:
        return self._loaded

    def readiness(self) -> dict[str, bool]:
        return {"kokoro": bool(self._kokoro_pipes), "piper": self._piper_voice is not None}

    # -- synthesis ---------------------------------------------------------

    def synth(self, lang: str, text: str, speed: float) -> tuple[np.ndarray, int]:
        """Return (float32 mono PCM, sample_rate). Raises EngineError."""
        if not self._loaded:
            raise EngineError("engines not loaded")
        spec = spec_for_lang(lang)
        try:
            if spec.engine == "piper":
                return self._synth_piper(text, speed)
            return self._synth_kokoro(lang, text, speed)
        except EngineError:
            raise
        except Exception as exc:  # pragma: no cover - defensive
            _LOGGER.exception("synthesis failed lang=%s engine=%s", lang, spec.engine)
            raise EngineError(str(exc)) from exc

    def _synth_kokoro(self, lang: str, text: str, speed: float) -> tuple[np.ndarray, int]:
        pipe = self._kokoro_pipes[lang]
        _code, voice = KOKORO_VOICES[lang]
        chunks = [
            a.numpy() if hasattr(a, "numpy") else a
            for _gs, _ps, a in pipe(text, voice=voice, speed=speed)
        ]
        if not chunks:
            raise EngineError("kokoro produced no audio")
        return np.concatenate(chunks), 24000

    def _synth_piper(self, text: str, speed: float) -> tuple[np.ndarray, int]:
        from piper import SynthesisConfig

        chunks = list(
            self._piper_voice.synthesize(
                text, syn_config=SynthesisConfig(length_scale=1.0 / speed)
            )
        )
        if not chunks:
            raise EngineError("piper produced no audio")
        audio = np.concatenate([c.audio_float_array for c in chunks])
        return audio, int(chunks[0].sample_rate)
