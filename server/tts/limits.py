"""Per-IP rate limiting and the bounded synthesis worker pool."""

from __future__ import annotations

import asyncio
import threading
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor


class RateLimited(Exception):
    pass


class Busy(Exception):
    pass


class RateLimiter:
    """Fixed window: at most `max_misses` cache-missing requests per IP
    per `window_s` seconds. Cache hits never consume quota.

    Stale entries (IPs whose newest hit fell out of the window) are swept
    once the table grows past `sweep_threshold`, so a client rotating
    spoofed IPs cannot grow the dict without bound."""

    def __init__(
        self,
        max_misses: int = 60,
        window_s: float = 60.0,
        sweep_threshold: int = 10000,
    ) -> None:
        self.max_misses = max_misses
        self.window_s = window_s
        self._sweep_threshold = sweep_threshold
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, ip: str) -> None:
        now = time.monotonic()
        with self._lock:
            if len(self._hits) >= self._sweep_threshold:
                self._sweep(now)
            q = self._hits[ip]
            while q and now - q[0] >= self.window_s:
                q.popleft()
            if len(q) >= self.max_misses:
                raise RateLimited()
            q.append(now)

    def _sweep(self, now: float) -> None:
        stale = [
            ip for ip, q in self._hits.items() if not q or now - q[-1] >= self.window_s
        ]
        for ip in stale:
            del self._hits[ip]
        if stale:
            import logging

            logging.getLogger("lovevox.tts.limits").info(
                "rate limiter swept stale_ips=%d remaining=%d", len(stale), len(self._hits)
            )

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class WorkerPool:
    """Bounded worker pool: at most `workers` concurrent jobs, at most
    `queue_max` queued beyond that; per-job timeout.

    Blocking work runs in a DEDICATED `ThreadPoolExecutor(max_workers=workers)`
    (not the default executor): a timed-out job keeps occupying one of the
    pool's threads until the underlying engine call returns, so cancelled
    syntheses cannot pile up beyond `TTS_WORKERS`."""

    def __init__(self, workers: int = 2, queue_max: int = 32, timeout_s: float = 20.0) -> None:
        self._sem = asyncio.Semaphore(workers)
        self._queue_max = queue_max
        self._timeout_s = timeout_s
        self._waiting = 0
        self._lock = asyncio.Lock()
        self._executor = ThreadPoolExecutor(
            max_workers=workers, thread_name_prefix="tts-worker"
        )

    async def run(self, fn, timeout_s: float | None = None):
        async with self._lock:
            if self._waiting >= self._queue_max:
                raise Busy()
            self._waiting += 1
        try:
            return await asyncio.wait_for(
                self._exec(fn), timeout_s if timeout_s is not None else self._timeout_s
            )
        finally:
            async with self._lock:
                self._waiting -= 1

    async def _exec(self, fn):
        async with self._sem:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(self._executor, fn)

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False)
