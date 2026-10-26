# Love-Vox TTS service (Kokoro-82M + Piper, CPU only).
# Build context: the repo root (see .dockerignore); image contains app code in
# /srv, models in /models, cache volume at /cache.

FROM python:3.11-slim AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends espeak-ng ffmpeg curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY server/tts/requirements.txt ./
# CPU-only torch from the PyTorch CPU index (no CUDA wheels in the image)
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.7.1 \
 && pip install --no-cache-dir -r requirements.txt

COPY server/tts/ /srv/
# Models are downloaded at build time; no network access is needed at runtime.
ENV HF_HOME=/models/hf \
    PIPER_VOICE_DIR=/models/piper
RUN python /srv/scripts/download_models.py
# Offline self-check: synthesize one sentence per language with HF_HUB_OFFLINE=1;
# a missing model/voice/lazy asset fails the build here, not at runtime.
RUN HF_HUB_OFFLINE=1 python /srv/scripts/selfcheck.py

# ---------------------------------------------------------------------------

FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends espeak-ng ffmpeg \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home tts

WORKDIR /srv
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /models /models
COPY server/tts/app.py server/tts/engines.py server/tts/cache.py server/tts/limits.py /srv/
COPY server/tts/scripts /srv/scripts

ENV PYTHONUNBUFFERED=1 \
    HF_HUB_OFFLINE=1 \
    HF_HOME=/models/hf \
    PIPER_VOICE_DIR=/models/piper \
    CACHE_DIR=/cache \
    CACHE_MAX_MB=4096 \
    TTS_WORKERS=2 \
    TTS_THREADS=4 \
    TTS_QUEUE_MAX=32 \
    TTS_TIMEOUT_S=20 \
    TTS_RATE_MISS_PER_MIN=60

RUN mkdir -p /cache && chown -R tts:tts /cache /srv
USER tts

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8090/health',timeout=4)"

# --no-access-log: uvicorn's access log prints the full request line (incl. the
# ?text= query) — spoken text must never land in stdout logs.
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090", "--no-access-log"]
