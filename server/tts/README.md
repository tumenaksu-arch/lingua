# Love-Vox TTS sunucusu (m7 — doğal sunucu sesi)

Küçük bir FastAPI tabanlı TTS HTTP servisi. **Kokoro-82M** (Apache-2.0) ile
İngilizce/İspanyolca/Fransızca/İtalyanca, **Piper** (GPL-3.0, yalnızca sunucu
tarafında) ile Almanca sentezler. Yalnızca CPU — GPU başka bir ürüne ayrılmıştır.

## Sözleşme (contract)

nginx, `https://ankaxai.ai/lovevox-api/tts/` yolunu `http://lovevox_tts:8090/`
adresine yönlendirir. Uygulamadaki worker buna göre kodlanmıştır; **değiştirme**.

- `GET /health` → `{ "ok": bool, "engines": { "kokoro": bool, "piper": bool } }`
  (`ok` ve motor bayrakları yükleme tamamlanınca `true` olur.)
- `GET /v1/speak?lang=en&text=<urlencoded>&speed=1.0` → `200 audio/mpeg`
  (MP3, mono, 64 kbps — ffmpeg ile kodlanır).
  - `lang ∈ en,de,es,fr,it`; `text` kırpılıp boşluklar normalize edildikten sonra
    1–300 karakter; `speed` 0.5–1.3 aralığında, 0.05'e yuvarlanır
    (Kokoro `speed=`, Piper `length_scale = 1/speed`).
  - Başlıklar: `Cache-Control: public, max-age=31536000, immutable`,
    `Content-Length`, `X-Lovevox-Cache: hit|miss`,
    `Cross-Origin-Resource-Policy: same-origin`.
- Hatalar JSON `{ "error", "message" }` (`message` Türkçe):
  - `400 bad_request` — geçersiz lang/text/speed
  - `429 rate_limited` — IP başına dakikada 60 cache-miss (client IP
    `X-Lovevox-Client-IP` başlığından, yoksa soket adresi; başlık yalnızca
    `TTS_TRUST_PROXY=1` iken güvenilir); cache hit'ler limitli değil;
    başlıksız loopback istekleri (örn. `docker exec … isit.py`) limit muaf
  - `503 busy` — kuyruk dolu veya sentez zaman aşımı (20 sn)
  - `503 not_ready` — motorlar henüz yüklenmedi
  - `500 synth_failed` — sentez veya MP3 kodlama hatası

## Davranış

- **Disk cache**: anahtar `sha256(engine|voice|speed|normalize edilmiş metin)` →
  `CACHE_DIR/<2 hex>/<key>.mp3`; atomik yazım (tmp + rename); boyut sınırı
  `CACHE_MAX_MB` (varsayılan 4096) aşılınca arka plan görevi en eski
  (mtime) dosyaları siler; hit'te mtime yenilenir (LRU).
- **Eşzamanlılık**: sınırlı worker havuzu (`TTS_WORKERS`, varsayılan 2), worker
  başına torch iş parçacığı (`TTS_THREADS`, varsayılan 4), kuyruk üst sınırı
  (`TTS_QUEUE_MAX`, varsayılan 32) → doluysa 503; istek başına 20 sn zaman aşımı.
- **Modeller** imaj derleme sırasında indirilir (bakım: `scripts/download_models.py`);
  çalışma zamanında `HF_HUB_OFFLINE=1` — ağ erişimi yok.
- **Asla metin loglanmaz**; yalnızca lang, metin uzunluğu, cache hit/miss ve
  gecikme loglanır.
- Sesler: en → Kokoro `af_heart`, es → `ef_dora`, fr → `ff_siwis`,
  it → `if_sara`, de → Piper `de_DE-thorsten-high`.

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `CACHE_DIR` | `/cache` | Disk cache dizini |
| `CACHE_MAX_MB` | `4096` | LRU budama sınırı (MB) |
| `TTS_WORKERS` | `2` | Eşzamanlı sentez worker'ı |
| `TTS_THREADS` | `4` | Worker başına torch iş parçacığı |
| `TTS_QUEUE_MAX` | `32` | Bekleme kuyruğu üst sınırı |
| `TTS_TIMEOUT_S` | `20` | İstek başına sentez zaman aşımı |
| `TTS_RATE_MISS_PER_MIN` | `60` | IP başına dakikalık miss limiti |
| `TTS_TRUST_PROXY` | (kapalı) | `1` ise `X-Lovevox-Client-IP` başlığı güvenilir (üretim proxy'si) |
| `PIPER_VOICE_DIR` | `/models/piper` | Piper ses dosyaları dizini |
| `HF_HUB_OFFLINE` | (imajda `1`) | Çalışma zamanında ağ kapalı |

## Geliştirme (host'ta)

```bash
python3 -m venv server/tts/.venv
server/tts/.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.7.1
server/tts/.venv/bin/pip install -r server/tts/requirements.txt -r server/tts/requirements-dev.txt
cd server/tts && .venv/bin/python -m pytest -q
```

`requirements.txt` yalnızca çalışma zamanı bağımlılıklarını içerir; test
araçları (`pytest`, `httpx`) `requirements-dev.txt`'tedir ve üretim imajına
asla girmez.

Testler motorları mock'lar (espeak-ng/ffmpeg gerekmez). Gerçek motorlu tek smoke
testi opt-in'dir: `LOVEVOX_REAL_SMOKE=1 .venv/bin/python -m pytest -q
tests/test_smoke_real.py -rs` — bu host'ta espeak-ng eksikse skip olur.
Çıktılar `.smoke/` altına yazılır (gitignore'lu).

## Üretim (Docker)

```bash
docker build -f server/tts/Dockerfile -t lovevox-tts .
docker run -d --name lovevox_tts -p 8090:8090 -v lovevox-tts-cache:/cache lovevox-tts
```

İmaj `python:3.11-slim` tabanlıdır; `espeak-ng` ve `ffmpeg` apt ile kurulur,
torch yalnızca CPU tekerleğidir, modeller derleme sırasında iner, süreç root
dışı kullanıcıyla (`tts`, uid 10001) çalışır, `HEALTHCHECK` `/health`'i
`urllib` ile sorgular. Build context repo köküdür (bkz. `.dockerignore`).

Derleme sonunda `scripts/selfcheck.py` çalıştırılır: `HF_HUB_OFFLINE=1` altında
beş dilin her birinde kısa bir cümle sentezlenir; eksik model/ses/veri varsa
**build burada başarısız olur** (çalışma zamanında 500 yerine). Uvicorn
`--no-access-log` ile başlar — erişim logu istek satırını (yani `?text=`
içeriğini) yazacağı için asla açılmamalıdır; uygulama logları zaten yalnızca
lang/uzunluk/cache/latency içerir.

## Cache önceden ısıtma

```bash
# 1) konuşulabilir tüm metinleri çıkar (repo kökünden; tsx ilk seferde npx ile iner)
node server/tts/scripts/metinler.mjs        # -> server/tts/metinler.json

# 2) servise karşı uygulamanın gerçek hızlarında (1.0 ve 0.8) önceden iste
#    (idempotent; hit ucuzdur; loopback + başlıksız istekler limit muaf;
#    429 gelirse üstel geri çekilme yapar)
python server/tts/scripts/isit.py --base-url http://127.0.0.1:8090
```

`metinler.mjs` → `src/content` içindeki ders egzersizi prompt/cevapları, kelime
bilgisi, hikâye satırları ve not örneklerini hedef dile göre toplar
(`scripts/metinler.extract.ts` aracılığıyla `npx tsx` çalıştırır).

## LICENSES

| Bileşen | Lisans | Doğrulama |
|---|---|---|
| Kokoro-82M model + `kokoro` paketi | Apache-2.0 | `pip show kokoro` → "Apache License, Version 2.0" |
| `misaki` (G2P) | Apache-2.0 | `pip show misaki` → "Apache License, Version 2.0" |
| espeak-ng | GPL-3.0 | sistem paketi; sesletim (G2P) için bağlantılı kullanılır |
| Piper (`piper-tts`) motoru | GPL-3.0-or-later | `pip show piper-tts` → "GPL-3.0-or-later"; yalnızca sunucu tarafında, dağıtılmaz |
| `de_DE-thorsten-high` ses veri seti | CC0 | thorsten-voice model kartı (thorsten-voice.de: "CC0 lizensierten Trainingsdaten") |
| `ff_siwis` sesi (Kokoro fr) notu | SIWIS veri seti CC-BY 4.0 | SIWIS French Speech Synthesis Database (Honnet, Lazaridis, Garner, Yamagishi) — atıf gerekir |

Piper motoru GPL'dir; bu servis motoru yalnızca sunucuda çalıştırır, uygulamaya
gömmez ve dağıtmaz. Üretilen seslerin kullanımı ilgili ses veri seti
lisanslarına tabidir.
