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
from fastapi.exceptions import RequestValidationError
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

_LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}

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
    # Trust the X-Lovevox-Client-IP header (set only behind the known proxy).
    trust_proxy: bool = os.environ.get("TTS_TRUST_PROXY", "") == "1"
    autoload: bool = True

    @classmethod
    def from_env(cls) -> "Settings":
        return cls()


def _client_ip(request: Request, trust_proxy: bool) -> tuple[str, bool]:
    """Resolve the limiter bucket key and whether the request is exempt.

    The X-Lovevox-Client-IP header is honoured only when trust_proxy is set
    (production compose sets TTS_TRUST_PROXY=1); otherwise the socket address
    is used. Requests arriving from loopback WITHOUT the header (e.g.
    `docker exec ... isit.py --base http://127.0.0.1:8090`) are exempt from
    the per-IP miss limit so cache pre-warm is never throttled."""
    header = request.headers.get("x-lovevox-client-ip")
    if trust_proxy and header:
        return header, False
    host = request.client.host if request.client is not None else ""
    exempt = not header and host in _LOOPBACK_HOSTS
    return host, exempt


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
        state["inflight"] = {}
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
        state["pool"].shutdown()

    app = FastAPI(title="Love-Vox TTS", docs_url=None, redoc_url=None, lifespan=lifespan)
    app.state.tts_settings = settings

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, _exc: RequestValidationError):
        # Any leftover FastAPI validation failure still maps to the contract
        # shape (handlers below validate manually, this is the safety net).
        return _err(400, "bad_request", "Geçersiz istek parametreleri.")

    @app.get("/health")
    async def health() -> JSONResponse:
        eng = state.get("engines")
        readiness = eng.readiness() if eng is not None else {"kokoro": False, "piper": False}
        ready = bool(readiness["kokoro"] and readiness["piper"])
        return JSONResponse(content={"ok": ready, "engines": readiness})

    @app.get("/v1/speak")
    async def speak(
        request: Request,
        lang: str | None = Query(None),
        text: str | None = Query(None),
        speed: str | None = Query("1.0"),
    ) -> Response:
        # Manual validation (params declared optional so FastAPI's own 422 is
        # never hit): the contract promises 400 {"error":"bad_request"}.
        if lang is None or lang not in LANGS:
            return _err(400, "bad_request", f"Desteklenmeyen dil: {lang}.")
        if text is None:
            return _err(400, "bad_request", "Metin parametresi gerekli.")
        norm = normalize_text(text)
        if not (TEXT_MIN <= len(norm) <= TEXT_MAX):
            return _err(
                400, "bad_request",
                f"Metin uzunluğu {TEXT_MIN}-{TEXT_MAX} karakter olmalı.",
            )
        try:
            speed_f = float(speed) if speed is not None else 1.0
        except (TypeError, ValueError):
            return _err(
                400, "bad_request",
                f"Hız {SPEED_MIN}-{SPEED_MAX} aralığında olmalı.",
            )
        if not (SPEED_MIN <= speed_f <= SPEED_MAX):
            return _err(
                400, "bad_request",
                f"Hız {SPEED_MIN}-{SPEED_MAX} aralığında olmalı.",
            )
        speed_f = round_speed(speed_f)

        eng: Engines = state["engines"]
        spec = spec_for_lang(lang)
        readiness = eng.readiness()
        if not readiness[spec.engine]:
            return _err(503, "not_ready", "Ses motoru henüz hazır değil.")

        key = cache_key(spec.engine, spec.voice, speed_f, norm)

        t0 = time.monotonic()
        loop = asyncio.get_running_loop()
        cached = await loop.run_in_executor(None, state["cache"].get, key)
        if cached is not None:
            latency = time.monotonic() - t0
            _LOGGER.info(
                "speak lang=%s len=%d cache=hit latency_ms=%d",
                lang, len(norm), int(latency * 1000),
            )
            return _audio(cached, "hit")

        client_ip, exempt = _client_ip(request, settings.trust_proxy)
        if not exempt:
            try:
                state["limiter"].check(client_ip)
            except RateLimited:
                return _err(429, "rate_limited", "Çok fazla istek, lütfen bekleyin.")

        try:
            mp3 = await _synthesize(key, lang, norm, speed_f)
        except Busy:
            return _err(503, "busy", "Sunucu şu an meşgul, lütfen tekrar deneyin.")
        except TimeoutError:
            return _err(503, "busy", "Sentez zaman aşımına uğradı.")
        except EngineError:
            return _err(500, "synth_failed", "Ses üretilemedi.")

        latency = time.monotonic() - t0
        _LOGGER.info(
            "speak lang=%s len=%d cache=miss latency_ms=%d",
            lang, len(norm), int(latency * 1000),
        )
        return _audio(mp3, "miss")

    async def _synthesize(key: str, lang: str, norm: str, speed: float) -> bytes:
        """Single-flight synthesis: concurrent identical misses share one job."""
        inflight: dict = state["inflight"]
        existing = inflight.get(key)
        if existing is not None:
            return await existing
        task = asyncio.create_task(_do_synthesize(key, lang, norm, speed))
        inflight[key] = task
        try:
            return await task
        finally:
            if inflight.get(key) is task:
                del inflight[key]

    async def _do_synthesize(key: str, lang: str, norm: str, speed: float) -> bytes:
        eng: Engines = state["engines"]
        # Synthesis and MP3 encoding both run in the bounded worker pool, with
        # the per-request timeout covering each stage; blocking cache I/O runs
        # in the default executor so the event loop never stalls.
        pcm, sr = await state["pool"].run(lambda: eng.synth(lang, norm, speed))
        mp3 = await state["pool"].run(lambda: pcm_to_mp3(pcm, sr))
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, state["cache"].put, key, mp3)
        return mp3

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
