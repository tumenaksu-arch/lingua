# lovevox-ai — Claude konuşma pratiği servisi (Love-Vox madde 6, SUNUCU)

Türkçe bilen öğrencilerin İngilizce/Almanca/İspanyolca/Fransızca/İtalyanca
konuşma pratiği yapması için küçük, bağımsız bir Node 22 + TypeScript HTTP
servisi. Uygulamadan gelen istekleri Claude API'sine (`@anthropic-ai/sdk`)
proxy'ler; kimlik doğrulama Supabase JWT ile, günlük mesaj limiti self-hosted
PostgREST üzerindeki `ai_usage` RPC'leriyle (`supabase/migrations/0004_ai_kullanim.sql`)
yönetilir. Konuşma metni **hiçbir yerde saklanmaz veya loglanmaz**.

Konteyner içinde taban yol `/`dır; nginx şu eşlemeyi yapar:
`https://ankaxai.ai/lovevox-api/ai/` → `http://lovevox_ai:8080/`.

## Sözleşme

| Yöntem + yol | Kimlik | Yanıt |
|---|---|---|
| `GET /health` | — | 200 `{ ok: true }` |
| `GET /v1/status` | isteğe bağlı Bearer | `{ enabled, limit, remaining \| null }` |
| `GET /v1/scenarios?courseId=tr-en` | — | `{ scenarios: Scenario[] }` |
| `POST /v1/chat` | **zorunlu** Bearer | 200 `{ reply, replyTr, correction, done, remaining }` |

- `Scenario = { id, titleTr, descriptionTr, level: 'A1'\|'A2'\|'B1', goalTr, opener }`;
  8 senaryo × 5 kurs (`tr-en`, `tr-de`, `tr-es`, `tr-fr`, `tr-it`); `opener`
  asistanın hedef dildeki ilk cümlesidir.
- `POST /v1/chat` gövdesi: `{ courseId, scenarioId, history: { role, text }[]
  (≤ 20, öğe ≤ 600 kr), message (1–500 kr) }`.
- Hatalar (Türkçe `message` ile): `400 bad_request`, `401 auth`,
  `429 limit` (yanında `remaining: 0`), `503 not_configured`, `502 upstream`
  (Claude hatası/red/zaman aşımı — rezerve edilen mesaj iade edilir).
- CORS: aynı-kaynak yayın; `OPTIONS`'a kimlik bilgisi içermeyen minimal yanıt.

## Çevre değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `8080` | Dinleme portu |
| `ANTHROPIC_API_KEY` | — | Yoksa `enabled=false`, `/v1/chat` → 503 (servis yine ayağa kalkar) |
| `AI_MODEL` | `claude-opus-5-5` | Claude modeli |
| `AI_EFFORT` | `low` | `output_config.effort` (`low\|medium\|high\|xhigh\|max`) |
| `AI_DAILY_LIMIT` | `30` | Kullanıcı başına günlük mesaj |
| `AI_GLOBAL_DAILY_CAP` | `3000` | Tüm kullanıcılar için günlük tavan (`ai_usage_take` `p_global_cap`) |
| `SUPABASE_JWT_SECRET` | — | GoTrue erişim jetonu doğrulama anahtarı (HS256) |
| `SUPABASE_REST_URL` | — | PostgREST taban URL'si (ör. `https://ankaxai.ai/lovevox-api/rest/v1`) |
| `SUPABASE_SERVICE_KEY` | — | PostgREST `ai_usage_take`/`ai_usage_record` çağrılarında apikey + Bearer |

## Çalıştırma

```bash
npm install
npm run build
npm start            # dist/index.js, PORT varsayılan 8080
```

Geliştirme/test:

```bash
npm test             # vitest (Claude SDK ve fetch taklidi)
npx tsc --noEmit
# Prototip entegrasyon testi (yalnızca yerel prototip; bkz. scratchpad/supa/PROTO.md):
SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon> SUPA_SERVICE=<service> npx vitest run test/integration
```

Docker (multi-stage, root'suz kullanıcı, `HEALTHCHECK wget /health`):

```bash
docker build -t lovevox-ai .
docker run -p 8080:8080 --env-file .env lovevox-ai
```

## Tasarım notları

- **SDK kullanımı**: yalnızca dokümante edilmiş çağrılar —
  `new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 })` ve
  `client.messages.parse({ model, max_tokens: 2000, system, messages,
  output_config: { effort, format: zodOutputFormat(ChatReplySchema) } })`.
  `temperature`/`top_p`/`top_k` **asla gönderilmez**. Yanıt okunmadan önce
  `stop_reason === 'refusal'` kontrol edilir (red → 502 + iade).
- **Server-side refusal fallback (`fallbacks: "default"`, beta
  `server-side-fallback-2026-07-01`)**: dokümanlarda bu parametre yalnızca
  beta istek gövdesinde (`client.beta.messages.create`) tanımlıdır;
  yapılandırılmış çıktı için kullandığımız kararlı `client.messages.parse`
  yardımcısı bu parametreyi/beta başlığını taşıyamaz (SDK tiplerinde yok).
  Bu yüzden bu sürümde fallback atlanır; red yine de `stop_reason` üzerinden
  güvenle 502'ye dönüşür.
- **Sistem komutu**: önce kararlı kural bloğu (`cache_control:
  { type: 'ephemeral' }`), sonra isteğe özel kurs/senaryo bloğu. Seviyeye
  uygun 1-3 kısa cümle, yalnızca hedef dilde yanıt, doğal Türkçe çeviri
  (`replyTr`), yalnızca gerçek hata varsa kısa Türkçe açıklamalı düzeltme,
  hedefe ulaşınca `done=true`, konu dışına çıkılırsa nazikçe senaryoya dönüş.
  Kullanıcılar reşit olmayabilir: yaşa uygun içerik, kişisel veri asla
  istenmez/saklanmaz, güvenli olmayan konular nazikçe reddedilip konu değiştirilir.
- **Limit akışı**: Claude çağrısından önce `ai_usage_take(p_user, p_limit,
  p_global_cap)`; `-1` → 429 (Claude çağrılmaz). Başarıda
  `ai_usage_record(input, output, refund=false)`; hata/redde `refund=true`.
- **Log**: mesaj metni veya içerik asla loglanmaz; yalnızca kullanıcı kimliği
  SHA-256 özeti, durum kodu, gecikme ve token sayıları.
