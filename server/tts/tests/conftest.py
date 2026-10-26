"""Shared fixtures: FastAPI TestClient with fully mocked engines + encoder."""

from __future__ import annotations

import time

import numpy as np
import pytest
from fastapi.testclient import TestClient

import app as app_module
from app import Settings, create_app
from engines import EngineError


class FakeEngines:
    """Drop-in replacement for Engines; returns a short sine wave."""

    def __init__(self, kokoro_ready: bool = True, piper_ready: bool = True) -> None:
        self.kokoro_ready = kokoro_ready
        self.piper_ready = piper_ready
        self.loaded = kokoro_ready and piper_ready
        self.calls: list[tuple[str, str, float]] = []
        self.fail = False
        self.delay_s = 0.0

    def readiness(self) -> dict:
        return {"kokoro": self.kokoro_ready, "piper": self.piper_ready}

    def synth(self, lang: str, text: str, speed: float):
        self.calls.append((lang, text, speed))
        if self.delay_s:
            time.sleep(self.delay_s)
        if self.fail:
            raise EngineError("mock failure")
        t = np.linspace(0.0, 0.1, 2400, dtype=np.float32)
        return 0.1 * np.sin(2 * np.pi * 440.0 * t), 24000


@pytest.fixture
def make_client(tmp_path, monkeypatch, request):
    """Factory: make_client(**settings_overrides) -> (TestClient, FakeEngines).

    The TestClient startup context is entered eagerly and closed via finalizer."""

    monkeypatch.setattr(
        app_module, "pcm_to_mp3", lambda pcm, sr: b"FAKE-MP3:" + str(len(pcm)).encode()
    )

    def _make(engines: FakeEngines | None = None, **overrides):
        fake = engines or FakeEngines()
        settings = Settings(
            cache_dir=str(tmp_path / "cache"),
            cache_max_mb=overrides.pop("cache_max_mb", 4096),
            workers=overrides.pop("workers", 2),
            queue_max=overrides.pop("queue_max", 32),
            timeout_s=overrides.pop("timeout_s", 20.0),
            rate_misses=overrides.pop("rate_misses", 60),
            autoload=False,
            **overrides,
        )
        app = create_app(settings=settings, engines=fake)
        client = TestClient(app)
        client.__enter__()
        request.addfinalizer(lambda: client.__exit__(None, None, None))
        return client, fake

    return _make
