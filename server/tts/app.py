"""Love-Vox natural TTS HTTP service (Kokoro-82M + Piper, CPU only).

Contract (behind nginx https://ankaxai.ai/lovevox-api/tts/ -> :8090/):
  GET /health -> { ok, engines: { kokoro, piper } }
  GET /v1/speak?lang=en&text=...&speed=1.0 -> 200 audio/mpeg
"""

from __future__ import annotations

import asyncio
import io
import logging
from contextlib import asynccontextmanager
import os
import re
import subprocess
import threading
import time
from dataclasses import dataclass

import numpy as np
from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, Response

from cache import DiskCache, cache_key
from engines import EngineError, Engines, spec_for_lang
from limits import Busy, RateLimiter, RateLimited, WorkerPool

_LOGGER = logging.getLogger("lovevox.tts")

LANGS = ("en", "de", "es", "fr", "it")
TEXT_MIN = 1
TEXT_MAX = 300
SPEED_MIN = 0.5
SPEED_MAX = 1.3
MP3_BITRATE = "64k"  # mono, within the contracted 48-64 kbps

_WS_RE = re.compile(r"\s+")


def normalize_text(text: str) -> str:
    """Trim and collapse all whitespace runs to single spaces."""
    return _WS_RE.sub(" ", text).strip()


def round_speed(speed: float) -> float:
    """Round to the nearest 0.05."""
    return round(round(speed / 0.05) * 0.05, 2)


def pcm_to_mp3(pcm: np.ndarray, sample_rate: int) -> bytes:
    """Encode float32 mono PCM to MP3 via ffmpeg (installed in the image)."""
    import soundfile as sf

    wav = io.BytesIO()
    sf.write(wav, pcm, sample_rate, format="WAV", subtype="PCM_16")
    proc = subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", "pipe:0",
            "-b:a", MP3_BITRATE, "-ac", "1", "-f", "mp3", "pipe:1",
        ],
        input=wav.getvalue(),
        capture_output=True,
    )
    if proc.returncode != 0 or not proc.stdout:
        raise EngineError(f"mp3 encode failed: {proc.stderr.decode('utf-8', 'replace')[:200]}")
    return proc.stdout


def _err(status: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": error, "message": message})


@dataclass
class Settings:
    cache_dir: str = os.environ.get("CACHE_DIR", "/cache")
    cache_max_mb: int = int(os.environ.get("CACHE_MAX_MB", "4096"))
    workers: int = int(os.environ.get("TTS_WORKERS", "2"))
    threads: int = int(os.environ.get("TTS_THREADS", "4"))
    queue_max: int = int(os.environ.get("TTS_QUEUE_MAX", "32"))
    timeout_s: float = float(os.environ.get("TTS_TIMEOUT_S", "20"))
    rate_misses: int = int(os.environ.get("TTS_RATE_MISS_PER_MIN", "60"))
    rate_window_s: float = 60.0
    autoload: bool = True

    @classmethod
    def from_env(cls) -> "Settings":
        return cls()


def create_app(
    settings: Settings | None = None,
    engines: Engines | None = None,
    limiter: RateLimiter | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    state: dict = {}

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        state["cache"] = DiskCache(settings.cache_dir, settings.cache_max_mb)
        state["limiter"] = limiter or RateLimiter(settings.rate_misses, settings.rate_window_s)
        state["pool"] = WorkerPool(settings.workers, settings.queue_max, settings.timeout_s)
        state["stop"] = asyncio.Event()
        eng = engines if engines is not None else Engines(threads=settings.threads)
        state["engines"] = eng
        if settings.autoload and not getattr(eng, "loaded", False):
            thread = threading.Thread(target=_load_engines, args=(eng,), daemon=True)
            thread.start()
            state["load_thread"] = thread
        state["prune_task"] = asyncio.create_task(state["cache"].prune_loop(state["stop"]))
        yield
        state["stop"].set()
        task = state.get("prune_task")
        if task is not None:
            task.cancel()

    app = FastAPI(title="Love-Vox TTS", docs_url=None, redoc_url=None, lifespan=lifespan)
    app.state.tts_settings = settings

    @app.get("/health")
    async def health() -> JSONResponse:
        eng = state.get("engines")
        readiness = eng.readiness() if eng is not None else {"kokoro": False, "piper": False}
        ready = bool(readiness["kokoro"] and readiness["piper"])
        return JSONResponse(content={"ok": ready, "engines": readiness})

    @app.get("/v1/speak")
    async def speak(
        request: Request,
        lang: str = Query(...),
        text: str = Query(...),
        speed: float = Query(1.0),
    ) -> Response:
        if lang not in LANGS:
            return _err(400, "bad_request", f"Desteklenmeyen dil: {lang}.")
        norm = normalize_text(text)
        if not (TEXT_MIN <= len(norm) <= TEXT_MAX):
            return _err(
                400, "bad_request",
                f"Metin uzunluğu {TEXT_MIN}-{TEXT_MAX} karakter olmalı.",
            )
        if not (SPEED_MIN <= speed <= SPEED_MAX):
            return _err(
                400, "bad_request",
                f"Hız {SPEED_MIN}-{SPEED_MAX} aralığında olmalı.",
            )
        speed = round_speed(speed)

        eng: Engines = state["engines"]
        readiness = eng.readiness()
        if not (readiness["kokoro"] and readiness["piper"]):
            return _err(503, "not_ready", "Ses motorları henüz hazır değil.")

        spec = spec_for_lang(lang)
        key = cache_key(spec.engine, spec.voice, speed, norm)

        t0 = time.monotonic()
        cached = state["cache"].get(key)
        if cached is not None:
            latency = time.monotonic() - t0
            _LOGGER.info(
                "speak lang=%s len=%d cache=hit latency_ms=%d",
                lang, len(norm), int(latency * 1000),
            )
            return _audio(cached, "hit")

        client_ip = request.headers.get("x-lovevox-client-ip") or request.client.host
        try:
            state["limiter"].check(client_ip)
        except RateLimited:
            return _err(429, "rate_limited", "Çok fazla istek, lütfen bekleyin.")

        try:
            pcm, sr = await state["pool"].run(lambda: eng.synth(lang, norm, speed))
            mp3 = pcm_to_mp3(pcm, sr)
        except Busy:
            return _err(503, "busy", "Sunucu şu an meşgul, lütfen tekrar deneyin.")
        except TimeoutError:
            return _err(503, "busy", "Sentez zaman aşımına uğradı.")
        except EngineError:
            return _err(500, "synth_failed", "Ses üretilemedi.")

        state["cache"].put(key, mp3)
        latency = time.monotonic() - t0
        _LOGGER.info(
            "speak lang=%s len=%d cache=miss latency_ms=%d",
            lang, len(norm), int(latency * 1000),
        )
        return _audio(mp3, "miss")

    return app


def _audio(data: bytes, cache_status: str) -> Response:
    return Response(
        content=data,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Lovevox-Cache": cache_status,
            "Cross-Origin-Resource-Policy": "same-origin",
        },
    )


def _load_engines(eng: Engines) -> None:
    try:
        eng.load()
    except Exception:
        _LOGGER.exception("engine load failed")


app = create_app()
