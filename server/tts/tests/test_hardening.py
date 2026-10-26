"""Tests for the reviewed hardening fixes (audit round 2).

Each test fails if its fix is reverted:
  - 400 contract shape for ALL validation failures (no FastAPI 422)
  - per-engine readiness (kokoro down must not block de, piper down must not block en)
  - single-flight dedup of concurrent identical misses
  - ffmpeg/MP3 encode runs in the bounded pool with a timeout
  - dedicated ThreadPoolExecutor sized to TTS_WORKERS
  - rate-limiter stale-entry sweep + header trust gated behind TTS_TRUST_PROXY
  - loopback pre-warm exemption
  - isit.py defaults (speeds 1.0/0.8, delay 1.0, 429 backoff)
  - Dockerfile: --no-access-log, no dev deps in the runtime image
  - build downloads every Kokoro voice pack and warms all languages
"""

from __future__ import annotations

import asyncio
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest

import app as app_module
from limits import RateLimiter, WorkerPool
from tests.conftest import FakeEngines

HERE = __file__.rsplit("/", 1)[0]
TTS_DIR = HERE.rsplit("/", 1)[0]


def speak(client, lang="en", text="Hello world", speed=1.0, headers=None):
    return client.get(
        "/v1/speak",
        params={"lang": lang, "text": text, "speed": speed},
        headers=headers or {},
    )


# -- validation contract: every failure is 400 {"error": "bad_request"} -------


def test_missing_text_param_returns_400_not_422(make_client):
    client, _ = make_client()
    r = client.get("/v1/speak", params={"lang": "en"})  # no text at all
    assert r.status_code == 400
    assert r.json()["error"] == "bad_request"
    assert "message" in r.json()


def test_empty_text_value_returns_400(make_client):
    client, _ = make_client()
    r = client.get("/v1/speak?lang=en&text")  # param present, empty value
    assert r.status_code == 400
    assert r.json()["error"] == "bad_request"


def test_missing_lang_param_returns_400(make_client):
    client, _ = make_client()
    r = client.get("/v1/speak", params={"text": "hello"})
    assert r.status_code == 400
    assert r.json()["error"] == "bad_request"


def test_non_numeric_speed_returns_400_not_422(make_client):
    client, _ = make_client()
    r = client.get("/v1/speak?lang=en&text=hello&speed=abc")
    assert r.status_code == 400
    assert r.json()["error"] == "bad_request"


# -- per-engine readiness ------------------------------------------------------


def test_kokoro_down_does_not_block_piper(make_client):
    client, _ = make_client(engines=FakeEngines(kokoro_ready=False, piper_ready=True))
    r_en = speak(client, lang="en")
    assert r_en.status_code == 503
    assert r_en.json()["error"] == "not_ready"
    assert speak(client, lang="de", text="Hallo Welt").status_code == 200
    h = client.get("/health").json()
    assert h == {"ok": False, "engines": {"kokoro": False, "piper": True}}


def test_piper_down_does_not_block_kokoro(make_client):
    client, _ = make_client(engines=FakeEngines(kokoro_ready=True, piper_ready=False))
    r_de = speak(client, lang="de", text="Hallo Welt")
    assert r_de.status_code == 503
    assert r_de.json()["error"] == "not_ready"
    assert speak(client, lang="en").status_code == 200


# -- single-flight / stampede protection ---------------------------------------


def test_concurrent_identical_misses_synthesize_once(make_client):
    client, fake = make_client(workers=1, queue_max=32, timeout_s=10.0)
    fake.delay_s = 0.3
    transport = httpx.ASGITransport(app=client.app)

    async def fire():
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as ac:
            return await asyncio.gather(
                *[
                    ac.get("/v1/speak", params={"lang": "en", "text": "stampede"})
                    for _ in range(6)
                ]
            )

    responses = asyncio.run(fire())
    assert all(r.status_code == 200 for r in responses)
    assert len(fake.calls) == 1  # one engine call shared by all six requests


# -- MP3 encode runs in the bounded pool, covered by the timeout ---------------


def test_mp3_encode_timeout_returns_503(make_client, monkeypatch):
    client, fake = make_client(workers=1, timeout_s=0.2)

    def slow_encode(_pcm, _sr):
        time.sleep(1.0)
        return b"MP3"

    monkeypatch.setattr(app_module, "pcm_to_mp3", slow_encode)
    r = speak(client, text="encode timeout")
    assert r.status_code == 503
    assert r.json()["error"] == "busy"


def test_mp3_encode_does_not_block_event_loop(make_client, monkeypatch):
    """While encoding blocks its worker thread, the event loop stays responsive."""
    client, _ = make_client()
    started = threading.Event()
    release = threading.Event()

    def gated_encode(_pcm, _sr):
        started.set()
        release.wait(timeout=10.0)  # holds the worker thread, not the loop
        return b"MP3"

    monkeypatch.setattr(app_module, "pcm_to_mp3", gated_encode)
    transport = httpx.ASGITransport(app=client.app)

    async def go():
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as ac:
            synth = asyncio.create_task(
                ac.get("/v1/speak", params={"lang": "en", "text": "gated"})
            )
            for _ in range(500):
                if started.is_set():
                    break
                await asyncio.sleep(0.01)
            assert started.is_set()
            # Event loop must still answer /health while encode blocks a worker.
            health = await asyncio.wait_for(ac.get("/health"), timeout=5.0)
            release.set()
            resp = await asyncio.wait_for(synth, timeout=5.0)
            return health, resp

    health, resp = asyncio.run(go())
    assert health.status_code == 200
    assert resp.status_code == 200
    assert resp.content == b"MP3"


# -- worker pool: dedicated executor sized to TTS_WORKERS ----------------------


def test_worker_pool_uses_dedicated_bounded_executor():
    pool = WorkerPool(workers=3, queue_max=8, timeout_s=1.0)
    assert isinstance(pool._executor, ThreadPoolExecutor)
    assert pool._executor._max_workers == 3  # noqa: SLF001 -- not the default executor
    pool.shutdown()


def test_timed_out_job_holds_its_worker_slot():
    """A timed-out synth must still occupy a pool slot until it finishes, so
    cancelled jobs cannot pile up beyond TTS_WORKERS on the default executor."""
    pool = WorkerPool(workers=1, queue_max=4, timeout_s=0.1)
    second_started = {"t": None}

    def slow():
        time.sleep(0.5)  # engine cannot be interrupted; thread keeps running
        return 1

    def fast():
        second_started["t"] = time.monotonic()
        return 2

    async def go():
        with pytest.raises(TimeoutError):
            await pool.run(slow)
        t0 = time.monotonic()
        assert await pool.run(fast, timeout_s=5.0) == 2
        return t0

    try:
        t0 = asyncio.run(go())
    finally:
        pool.shutdown()
    # With a dedicated 1-thread pool the second job starts only after the
    # timed-out job's thread finished; the default executor would start it
    # immediately.
    assert second_started["t"] - t0 >= 0.35


# -- rate limiter: sweep + proxy trust gating ----------------------------------


def test_rate_limiter_sweeps_stale_entries(monkeypatch):
    clock = {"t": 1000.0}
    monkeypatch.setattr("limits.time.monotonic", lambda: clock["t"])
    limiter = RateLimiter(max_misses=100, window_s=60.0, sweep_threshold=10)
    for i in range(30):  # rotate unique IPs, one hit each
        limiter.check(f"10.0.0.{i}")
    assert len(limiter._hits) == 30  # noqa: SLF001 -- fresh entries kept
    clock["t"] += 120.0  # every entry is now outside the window
    limiter.check("192.0.2.1")  # table past the threshold -> sweep runs
    assert len(limiter._hits) == 1  # noqa: SLF001 -- stale entries pruned


def test_client_ip_header_ignored_without_trust_proxy(make_client):
    client, _ = make_client(rate_misses=1, trust_proxy=False)
    h1 = {"X-Lovevox-Client-IP": "1.2.3.4"}
    h2 = {"X-Lovevox-Client-IP": "5.6.7.8"}
    assert speak(client, text="n1", headers=h1).status_code == 200
    # Same socket address -> same bucket even with different spoofed headers.
    assert speak(client, text="n2", headers=h2).status_code == 429


class _FakeRequest:
    def __init__(self, host: str, headers: dict):
        self.client = type("C", (), {"host": host})()
        self.headers = headers


def test_loopback_without_header_is_exempt():
    req = _FakeRequest("127.0.0.1", {})
    ip, exempt = app_module._client_ip(req, trust_proxy=False)
    assert exempt is True
    assert ip == "127.0.0.1"


def test_loopback_with_spoofed_header_is_not_exempt():
    req = _FakeRequest("127.0.0.1", {"x-lovevox-client-ip": "9.9.9.9"})
    ip, exempt = app_module._client_ip(req, trust_proxy=False)
    assert exempt is False
    assert ip == "127.0.0.1"  # untrusted header ignored, socket address used


def test_trust_proxy_uses_header():
    req = _FakeRequest("10.0.0.1", {"x-lovevox-client-ip": "9.9.9.9"})
    ip, exempt = app_module._client_ip(req, trust_proxy=True)
    assert (ip, exempt) == ("9.9.9.9", False)


# -- isit.py defaults -----------------------------------------------------------


def _load_isit():
    import importlib.util

    spec = importlib.util.spec_from_file_location("isit", f"{TTS_DIR}/scripts/isit.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_isit_defaults_match_app_speeds():
    isit = _load_isit()
    args = isit.parse_args([])
    assert list(args.speeds) == [1.0, 0.8]  # the app's real speeds, not 0.75
    assert args.delay >= 1.0  # <= 60 misses/min: never trips the per-IP limit


# -- Dockerfile / build static checks -------------------------------------------


def _read(path: str) -> str:
    with open(f"{TTS_DIR}/{path}", encoding="utf-8") as fh:
        return fh.read()


def test_dockerfile_disables_uvicorn_access_log():
    dockerfile = _read("Dockerfile")
    cmd_lines = [l for l in dockerfile.splitlines() if l.startswith("CMD")]
    assert len(cmd_lines) == 1
    assert "--no-access-log" in cmd_lines[0]


def test_runtime_requirements_have_no_dev_deps():
    reqs = _read("requirements.txt")
    names = {l.split("=")[0].split(">")[0].split("[")[0].strip().lower()
             for l in reqs.splitlines()
             if l.strip() and not l.startswith("#")}
    assert "pytest" not in names
    assert "httpx" not in names
    dockerfile = _read("Dockerfile")
    assert "requirements-dev.txt" not in dockerfile  # image installs runtime only
    assert "pip install --no-cache-dir -r requirements.txt" in dockerfile


def test_build_downloads_all_kokoro_voices_and_warms_all_langs():
    dl = _read("scripts/download_models.py")
    for voice in ("af_heart", "ef_dora", "ff_siwis", "if_sara"):
        assert voice in dl, f"voice pack {voice} not downloaded at build"
    for code in ("a", "e", "f", "i"):
        assert f'"{code}"' in dl, f"lang_code {code} not warmed at build"
    assert "load_single_voice" in dl


def test_selfcheck_covers_all_five_languages():
    import os

    assert os.path.exists(f"{TTS_DIR}/scripts/selfcheck.py")
    src = _read("scripts/selfcheck.py")
    for lang in ("en", "de", "es", "fr", "it"):
        assert f'"{lang}"' in src
    assert "HF_HUB_OFFLINE" in src
    dockerfile = _read("Dockerfile")
    assert "selfcheck.py" in dockerfile


@pytest.mark.parametrize("needle", ["pytest", "httpx"])
def test_venv_dev_deps_listed_in_dev_requirements(needle):
    assert needle in _read("requirements-dev.txt")
