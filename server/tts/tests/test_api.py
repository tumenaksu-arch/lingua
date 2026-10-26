"""Contract tests for the TTS HTTP API (engines mocked)."""

from __future__ import annotations

import asyncio

import httpx
import pytest

import app as app_module
import engines as engines_module
from tests.conftest import FakeEngines


def speak(client, lang="en", text="Hello world", speed=1.0, headers=None):
    return client.get(
        "/v1/speak",
        params={"lang": lang, "text": text, "speed": speed},
        headers=headers or {},
    )


# -- validation --------------------------------------------------------------


def test_invalid_lang_rejected(make_client):
    client, _ = make_client()
    r = speak(client, lang="xx")
    assert r.status_code == 400
    assert r.json()["error"] == "bad_request"


def test_empty_text_rejected(make_client):
    client, _ = make_client()
    assert speak(client, text="   ").status_code == 400


def test_too_long_text_rejected(make_client):
    client, _ = make_client()
    assert speak(client, text="x" * 301).status_code == 400
    assert speak(client, text="x" * 300).status_code == 200


def test_speed_bounds_rejected(make_client):
    client, _ = make_client()
    assert speak(client, speed=0.49).status_code == 400
    assert speak(client, speed=1.31).status_code == 400
    assert speak(client, speed=0.5).status_code == 200
    assert speak(client, speed=1.3).status_code == 200


def test_speed_rounded_to_005(make_client):
    client, fake = make_client()
    speak(client, text="Round me", speed=1.026)
    assert fake.calls[-1][2] == 1.05
    speak(client, text="Round me two", speed=1.01)
    assert fake.calls[-1][2] == 1.0


# -- caching -----------------------------------------------------------------


def test_cache_miss_then_hit(make_client):
    client, fake = make_client()
    r1 = speak(client, text="Cache test")
    assert r1.status_code == 200
    assert r1.headers["x-lovevox-cache"] == "miss"
    r2 = speak(client, text="Cache test")
    assert r2.status_code == 200
    assert r2.headers["x-lovevox-cache"] == "hit"
    assert r1.content == r2.content == b"FAKE-MP3:2400"
    assert len(fake.calls) == 1  # engine ran exactly once


def test_cache_file_written(make_client, tmp_path):
    client, _ = make_client()
    speak(client, text="File test")
    files = list((tmp_path / "cache").glob("*/*.mp3"))
    assert len(files) == 1
    assert files[0].read_bytes().startswith(b"FAKE-MP3")


def test_whitespace_normalisation_shares_cache_key(make_client):
    client, fake = make_client()
    speak(client, text="  hello \t\n  world  ")
    speak(client, text="hello world")
    assert len(fake.calls) == 1
    assert fake.calls[0][1] == "hello world"


def test_rounded_speed_shares_cache_key(make_client):
    client, fake = make_client()
    speak(client, text="Speed cache", speed=1.01)
    r = speak(client, text="Speed cache", speed=1.02)
    assert r.headers["x-lovevox-cache"] == "hit"
    assert len(fake.calls) == 1


# -- engine routing ----------------------------------------------------------


def test_engine_routing(monkeypatch, make_client):
    client, _ = make_client()
    specs = []
    real = engines_module.spec_for_lang

    def recorder(lang):
        spec = real(lang)
        specs.append((lang, spec.engine, spec.voice))
        return spec

    monkeypatch.setattr(app_module, "spec_for_lang", recorder)
    for lang in ("en", "de", "es", "fr", "it"):
        assert speak(client, lang=lang, text=f"routing {lang}").status_code == 200
    assert specs == [
        ("en", "kokoro", "af_heart"),
        ("de", "piper", "de_DE-thorsten-high"),
        ("es", "kokoro", "ef_dora"),
        ("fr", "kokoro", "ff_siwis"),
        ("it", "kokoro", "if_sara"),
    ]


# -- rate limiting -----------------------------------------------------------


def test_rate_limit_misses_only(make_client):
    client, _ = make_client()
    for i in range(60):
        assert speak(client, text=f"unique sentence {i}").status_code == 200
    r = speak(client, text="one sentence too many")
    assert r.status_code == 429
    assert r.json()["error"] == "rate_limited"


def test_cache_hits_not_rate_limited(make_client):
    client, fake = make_client(rate_misses=3)
    assert speak(client, text="hot text").status_code == 200
    for _ in range(10):
        assert speak(client, text="hot text").status_code == 200
    assert len(fake.calls) == 1


def test_rate_limit_uses_client_ip_header(make_client):
    client, _ = make_client(rate_misses=2)
    h1 = {"X-Lovevox-Client-IP": "1.2.3.4"}
    h2 = {"X-Lovevox-Client-IP": "5.6.7.8"}
    assert speak(client, text="a1", headers=h1).status_code == 200
    assert speak(client, text="a2", headers=h1).status_code == 200
    assert speak(client, text="a3", headers=h1).status_code == 429
    assert speak(client, text="b1", headers=h2).status_code == 200


# -- concurrency / readiness -------------------------------------------------


def test_queue_full_returns_503(make_client):
    client, fake = make_client(workers=1, queue_max=2, timeout_s=5.0)
    fake.delay_s = 0.3
    transport = httpx.ASGITransport(app=client.app)

    async def fire():
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as ac:
            return await asyncio.gather(
                *[
                    ac.get("/v1/speak", params={"lang": "en", "text": f"burst {i}"})
                    for i in range(8)
                ]
            )

    responses = asyncio.run(fire())
    statuses = sorted(r.status_code for r in responses)
    assert 503 in statuses
    assert all(r.status_code in (200, 503) for r in responses)
    busy = [r for r in responses if r.status_code == 503]
    assert all(r.json()["error"] == "busy" for r in busy)


def test_synth_timeout_returns_503(make_client):
    client, fake = make_client(workers=1, timeout_s=0.2)
    fake.delay_s = 1.0
    transport = httpx.ASGITransport(app=client.app)

    async def go():
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as ac:
            return await ac.get("/v1/speak", params={"lang": "en", "text": "slow"})

    r = asyncio.run(go())
    assert r.status_code == 503
    assert r.json()["error"] == "busy"


def test_not_ready_returns_503(make_client):
    client, _ = make_client(engines=FakeEngines(kokoro_ready=False, piper_ready=False))
    r = speak(client)
    assert r.status_code == 503
    assert r.json()["error"] == "not_ready"
    h = client.get("/health").json()
    assert h == {"ok": False, "engines": {"kokoro": False, "piper": False}}


def test_health_ready(make_client):
    client, _ = make_client()
    assert client.get("/health").json() == {
        "ok": True,
        "engines": {"kokoro": True, "piper": True},
    }


def test_synth_failure_returns_500(make_client):
    client, fake = make_client()
    fake.fail = True
    r = speak(client)
    assert r.status_code == 500
    assert r.json()["error"] == "synth_failed"


# -- headers -----------------------------------------------------------------


def test_response_headers(make_client):
    client, _ = make_client()
    for expected in ("miss", "hit"):
        r = speak(client, text="header check")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("audio/mpeg")
        assert r.headers["cache-control"] == "public, max-age=31536000, immutable"
        assert r.headers["x-lovevox-cache"] == expected
        assert r.headers["cross-origin-resource-policy"] == "same-origin"
        assert int(r.headers["content-length"]) == len(r.content)


# -- logging -----------------------------------------------------------------


def test_text_never_logged(make_client, caplog):
    client, _ = make_client()
    secret = "gizli-metin-7319"
    with caplog.at_level("INFO", logger="lovevox.tts"):
        speak(client, text=secret)
        speak(client, text=secret)
    assert secret not in caplog.text
    assert "lang=en" in caplog.text
    assert "cache=hit" in caplog.text and "cache=miss" in caplog.text
