"""Disk cache for synthesized MP3 files with LRU-by-mtime pruning."""

from __future__ import annotations

import hashlib
import logging
import os
import time
from pathlib import Path

_LOGGER = logging.getLogger("lovevox.tts.cache")

_PRUNE_INTERVAL_S = 60.0


def cache_key(engine: str, voice: str, speed: float, text: str) -> str:
    return hashlib.sha256(f"{engine}|{voice}|{speed}|{text}".encode("utf-8")).hexdigest()


class DiskCache:
    def __init__(self, root: str | Path, max_mb: int = 4096) -> None:
        self.root = Path(root)
        self.max_mb = max_mb
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self.root / key[:2] / f"{key}.mp3"

    def get(self, key: str) -> bytes | None:
        """Return file bytes on hit (touching mtime) or None on miss."""
        path = self._path(key)
        try:
            data = path.read_bytes()
            os.utime(path, None)  # LRU: refresh mtime on hit
            return data
        except FileNotFoundError:
            return None

    def put(self, key: str, data: bytes) -> Path:
        """Atomic write: tmp file + rename."""
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        os.replace(tmp, path)
        return path

    def prune(self) -> int:
        """Delete oldest-by-mtime files until total size <= cap.
        Returns number of files removed."""
        files: list[tuple[float, Path]] = []
        total = 0
        for p in self.root.glob("*/*.mp3"):
            try:
                st = p.stat()
            except FileNotFoundError:  # pragma: no cover - race
                continue
            files.append((st.st_mtime, p))
            total += st.st_size
        cap = self.max_mb * 1024 * 1024
        removed = 0
        if total > cap:
            files.sort()
            for _mtime, p in files:
                if total <= cap:
                    break
                try:
                    size = p.stat().st_size
                    p.unlink()
                    total -= size
                    removed += 1
                except FileNotFoundError:  # pragma: no cover - race
                    pass
        if removed:
            _LOGGER.info("cache pruned removed=%d remaining_bytes=%d", removed, total)
        return removed

    async def prune_loop(self, stop) -> None:
        """Background LRU pruning task; `stop` is an asyncio.Event."""
        import asyncio

        while not stop.is_set():
            try:
                await asyncio.wait_for(stop.wait(), timeout=_PRUNE_INTERVAL_S)
            except asyncio.TimeoutError:
                pass
            self.prune()
