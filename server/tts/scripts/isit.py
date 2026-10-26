#!/usr/bin/env python3
"""isit.py — cache pre-warm for the Love-Vox TTS service.

Reads a JSON list of {lang, text} (e.g. produced by metinler.mjs) and requests
each entry at speeds 1.0 and 0.75 against the service, so the disk cache is hot
before users arrive. Idempotent: already-cached entries are cheap hits.

Usage:
    python scripts/isit.py [--base-url http://127.0.0.1:8090] \
        [--input metinler.json] [--delay 0.05] [--speeds 1.0 0.75]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

LANGS = ("en", "de", "es", "fr", "it")


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Pre-warm the Love-Vox TTS cache.")
    p.add_argument("--base-url", default="http://127.0.0.1:8090")
    p.add_argument("--input", default=None,
                   help="JSON [{lang, text}] list; default: metinler.json next to this script")
    p.add_argument("--delay", type=float, default=0.05, help="seconds between requests")
    p.add_argument("--speeds", type=float, nargs="+", default=[1.0, 0.75])
    p.add_argument("--limit", type=int, default=None, help="only the first N entries")
    return p.parse_args(argv)


def fetch_one(base_url: str, lang: str, text: str, speed: float, timeout: float = 30.0) -> tuple[int, str]:
    qs = urllib.parse.urlencode({"lang": lang, "text": text, "speed": speed})
    req = urllib.request.Request(f"{base_url}/v1/speak?{qs}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.headers.get("X-Lovevox-Cache", "?")
    except urllib.error.HTTPError as exc:
        return exc.code, "-"


def main(argv=None) -> int:
    args = parse_args(argv)
    input_path = args.input
    if input_path is None:
        import os
        input_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "metinler.json")
    with open(input_path, encoding="utf-8") as fh:
        items = json.load(fh)
    items = [it for it in items if it.get("lang") in LANGS and it.get("text")]
    if args.limit:
        items = items[: args.limit]

    total = len(items) * len(args.speeds)
    hits = misses = errors = 0
    t0 = time.time()
    print(f"pre-warming {len(items)} texts x {len(args.speeds)} speeds against {args.base_url}")
    for i, item in enumerate(items):
        for speed in args.speeds:
            status, cache = fetch_one(args.base_url, item["lang"], item["text"], speed)
            if status == 200 and cache == "hit":
                hits += 1
            elif status == 200:
                misses += 1
            else:
                errors += 1
            done = hits + misses + errors
            if done % 100 == 0 or done == total:
                rate = done / max(time.time() - t0, 1e-6)
                print(f"  {done}/{total} (hit={hits} miss={misses} err={errors}, {rate:.0f}/s)", flush=True)
            if args.delay:
                time.sleep(args.delay)

    print(f"done in {time.time() - t0:.0f}s: hit={hits} miss={misses} error={errors}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
