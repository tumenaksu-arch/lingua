"""Disk cache unit tests: keys, atomic writes, LRU pruning."""

from __future__ import annotations

import os
import time

from cache import DiskCache, cache_key


def _make_cache(tmp_path, max_mb):
    return DiskCache(tmp_path / "cache", max_mb=max_mb)


def _write(cache: DiskCache, key: str, size: int) -> None:
    cache.put(key, b"x" * size)


def test_key_stable_and_sensitive():
    k1 = cache_key("kokoro", "af_heart", 1.0, "hello world")
    assert k1 == cache_key("kokoro", "af_heart", 1.0, "hello world")
    assert len(k1) == 64
    assert k1 != cache_key("kokoro", "af_heart", 1.05, "hello world")
    assert k1 != cache_key("piper", "af_heart", 1.0, "hello world")
    assert k1 != cache_key("kokoro", "af_heart", 1.0, "hello worlds")


def test_get_put_roundtrip(tmp_path):
    cache = _make_cache(tmp_path, 4096)
    key = cache_key("kokoro", "af_heart", 1.0, "hi")
    assert cache.get(key) is None
    path = cache.put(key, b"mp3data")
    assert cache.get(key) == b"mp3data"
    assert path.exists() and path.suffix == ".mp3"
    assert path == cache.root / key[:2] / f"{key}.mp3"
    # tmp file must not linger after atomic rename
    assert not path.with_suffix(".tmp").exists()


def test_hit_refreshes_mtime(tmp_path):
    cache = _make_cache(tmp_path, 4096)
    key = cache_key("kokoro", "af_heart", 1.0, "touch me")
    cache.put(key, b"a" * 100)
    path = cache._path(key)
    old = path.stat().st_mtime
    time.sleep(0.02)
    os.utime(path, (old - 1000, old - 1000))
    cache.get(key)
    assert path.stat().st_mtime > old - 1000


def test_lru_pruning_removes_oldest(tmp_path):
    cache = _make_cache(tmp_path, max_mb=1)  # 1 MiB cap
    keys = []
    for i in range(4):
        key = f"{i:064d}"[:64]
        keys.append(key)
        _write(cache, key, 350 * 1024)  # 4 x 350 KiB = 1400 KiB > 1 MiB cap
        os.utime(cache._path(key), (1000 + i, 1000 + i))  # controlled mtimes
    removed = cache.prune()
    assert removed == 2  # 1400 -> 700 KiB after dropping the two oldest
    # newest two files survive, oldest are gone
    assert cache.get(keys[0]) is None
    assert cache.get(keys[1]) is None
    assert cache.get(keys[3]) is not None


def test_pruning_noop_when_under_cap(tmp_path):
    cache = _make_cache(tmp_path, max_mb=4096)
    _write(cache, "a" * 64, 1024)
    assert cache.prune() == 0
