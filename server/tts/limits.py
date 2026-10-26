"""Per-IP rate limiting and the bounded synthesis worker pool."""

from __future__ import annotations

import asyncio
import threading
import time
from collections import defaultdict, deque


class RateLimited(Exception):
    pass


class Busy(Exception):
    pass


class RateLimiter:
    """Fixed window: at most `max_misses` cache-missing requests per IP
    per `window_s` seconds. Cache hits never consume quota."""

    def __init__(self, max_misses: int = 60, window_s: float = 60.0) -> None:
        self.max_misses = max_misses
        self.window_s = window_s
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, ip: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[ip]
            while q and now - q[0] >= self.window_s:
                q.popleft()
            if len(q) >= self.max_misses:
                raise RateLimited()
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class WorkerPool:
    """Bounded worker pool: at most `workers` concurrent jobs, at most
    `queue_max` queued beyond that; per-job timeout. Blocking work runs in
    the default executor; engines set their own thread budgets."""

    def __init__(self, workers: int = 2, queue_max: int = 32, timeout_s: float = 20.0) -> None:
        self._sem = asyncio.Semaphore(workers)
        self._queue_max = queue_max
        self._timeout_s = timeout_s
        self._waiting = 0
        self._lock = asyncio.Lock()

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
            return await loop.run_in_executor(None, fn)
