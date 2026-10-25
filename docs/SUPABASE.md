# Love-Vox Supabase (self-hosted)

Bu belge, 2026-10-25'ten itibaren Love-Vox'un backend'ini oluşturan **self-hosted Supabase** kurulumunu anlatır. (2026-10-25'e kadar Firebase Auth + Cloud Firestore kullanılıyordu; arşiv: `docs/arsiv/firebase/`.)

## Mimari

Sunucu, `ankaxai.ai` makinesidir. Konteynerler **bu depoda değil**, `ankaokul` deposunun `infra/docker-compose.yml` dosyasında tanımlıdır:

| Servis | İmge | İş |
|---|---|---|
| `lovevox_db` | `supabase/postgres` 17.6.1.136 | Postgres (şema + RLS burada) |
| `lovevox_auth` | GoTrue v2.197.0 | Auth (e-posta/şifre, 6 haneli kod) |
| `lovevox_rest` | PostgREST v14.18 | `public` şeması üstünde otomatik REST API |
| `lovevox_pgbackup` | günlük `pg_dump` | `/home/voidaadmin/ankaokul-backups/lovevox/` altına, 14 gün saklanır |

nginx yönlendirmeleri (sunucuda):

- `https://ankaxai.ai/lovevox-api/auth/v1` → GoTrue
- `https://ankaxai.ai/lovevox-api/rest/v1` → PostgREST
- `https://ankaxai.ai/lovevox/mail/` → e-posta şablonları (`public/mail/`)

İstemci tarafındaki dosyalar:

- `src/data/remote/supabase.ts` — `supabase-js` istemcisi; `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (bkz. `.env.example`). Anon key bilinçli olarak herkese açıktır; erişimi Postgres **RLS** politikaları korur. Yapılandırma yoksa uygulama tamamen yerel çalışır.
- `src/data/remote/auth.ts` — giriş/şifre/kod akışları (GoTrue).
- `src/data/remote/supabaseRemote.ts` — tablo okuma/yazma + senkron.
- `src/data/remote/social.ts` — profil (takma ad + davet kodu), arkadaşlar, haftalık sıralama.

## Şema ve RLS

- Şema: `supabase/migrations/0001_lovevox.sql` (öğrenme verisi + lig/arkadaş), `0002_siniflar.sql` (öğretmen/sınıf/ödev, anonim öğrenci kısıtları), `0003_sinif_duyurulari.sql` (tek yönlü duyuru). Canlıya uygulanmadan önce `pg_dump` yedeği alınır (`/home/voidaadmin/ankaokul-backups/lovevox/elle-*.dump`). Tablo adları yerel outbox adlarıyla birebir aynıdır (senkron 1:1 eşlenir).
- Tablolar: `user_stats`, `user_progress`, `srs_cards`, `events` (yalnız sahibi okur/yazar), `profiles` (takma ad + davet kodu, sahibi), `friends` (tek yönlü liste, sahibi yönetir), `leaderboard` (giriş yapan herkes okur, yalnız sahibi kendi satırını yazar). E-posta hiçbir herkese açık tabloda tutulmaz (KVKK).
- RLS varsayılanı red; her satır `auth.uid()`'ye aittir. `events.created_at` ve `profiles.invite_code` trigger ile değiştirilemez. Davet kodu çözümü yalnızca `resolve_invite()` fonksiyonuyla yapılır (tam tablo listeleme yok), arkadaş listesi `my_friends()` ile.

### Yeni migration uygulamak

1. Yeni dosyayı `supabase/migrations/` altına sıradaki numarayla ekle (tek dosya = tek transaction, `begin;`/`commit;` içinde).
2. Koordinatör (sunucudaki Claude oturumu) sunucuda uygular:

```bash
docker exec -i lovevox_db psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < supabase/migrations/<dosya>.sql
```

3. Değişiklikten sonra RLS testlerini yerel prototipe karşı çalıştır (aşağıya bak).

## RLS testleri ve smoke (yerel prototip)

Testler **yalnızca yerel prototipe** karşı koşulur, asla canlıya değil (ayrıntı: `scratchpad/supa/PROTO.md`; prototip: `SUPA_URL=http://127.0.0.1:35143`, posta yakalayıcı portu 35144).

```bash
# RLS entegrasyon testleri (node --test)
SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<PROTO.md'deki anon key> node --test supabase/tests/

# Uçtan uca smoke (kayıt → upsert → geri okuma → RLS izolasyonu → e-posta koduyla giriş)
SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key> node scripts/supabase-smoke.mjs
```

Kapsam özeti `supabase/tests/README.md` dosyasındadır.

## Yedekleme ve geri yükleme

- `lovevox_pgbackup` her gün `pg_dump` alır; dökümler `/home/voidaadmin/ankaokul-backups/lovevox/` altında **14 gün** saklanır.
- Geri yükleme sunucuda yapılır (konteyner kurulumu ve yedek düzeni `ankaokul` deposunda): önce hedef veritabanını durdur/boşalt, sonra dökümü `lovevox_db` içine `psql -U supabase_admin -d postgres < <döküm>.sql` ile uygula. Bu depodan sunucuya erişilmez; işlem sunucu tarafındaki Claude oturumunda yürütülür.

## E-posta

GoTrue, 6 haneli doğrulama kodlarını **Resend SMTP** üzerinden `noreply@ankaxai.ai` adresinden gönderir. Şablonlar `public/mail/giris-kodu.html` (giriş kodu) ve `public/mail/sifre-kodu.html` (şifre sıfırlama) olup `https://ankaxai.ai/lovevox/mail/` altından sunulur.

Giriş akışları (`src/data/remote/auth.ts`):

- **E-posta + şifre** ile giriş/kayıt.
- **E-posta + kod**: kod istenir, GoTrue doğrular.
- **"Şifremi unuttum"**: önce e-postaya kod gönderilir, kod doğrulanınca yeni şifre belirlenir.

## Eski Firebase kullanıcılarının taşınması

- `src/app/migrate.tsx` ekranı + `src/data/sync/legacyMigration.ts`: cihazda eski Firebase oturumu (`AsyncStorage` anahtarı `firebase:authUser:*`) bulunursa uygulama tek seferlik taşıma ekranı açar.
- Akış: aynı e-postaya 6 haneli kod gönderilir → kod doğrulanınca yerel satırlar eski Firebase uid'sinden yeni Supabase uid'sine taşınır → isteğe bağlı yeni şifre belirlenir. Eski anahtarlar ekran tamamlanınca silinir.
- Eski Firebase dosyaları `docs/arsiv/firebase/` altında arşivlidir. Firebase projesi `lingotr-18fbb` artık uygulama tarafından kullanılmıyor; bir süre yedek olarak tutuluyor, silinmesi ileride kullanıcının kararıdır.

## Gizli bilgiler

JWT secret, veritabanı parolası ve service key **yalnızca sunucudadır** (`~/ankaokul-secrets/lovevox-supabase.env` ve `ankaokul` deposunun `infra/.env` dosyası). Bu depoya ve belgelere asla yazılmaz; istemciye anon key dışında hiçbir anahtar girmez.

## Bilinen tuzaklar

1. **PostgREST zaman damgaları**: `timestamptz` alanları milisaniyesiz, `'+00:00'` son ekli döner (`2026-10-25T12:00:00+00:00`). `supabaseRemote.ts` çekilen her satırı `new Date(v).toISOString()` ile normalize eder; doğrudan PostgREST'e istek atan yeni kod da bunu yapmalı, yoksa yerel ISO dizgeleriyle sözlüksel/`Date.parse` karşılaştırması sapar.
2. **nginx lazy resolver**: `ankaxai.ai` nginx'i lovevox konteynerlerini tembel çözümler; konteynerler kapalıyken `edu-pilot.ai` gibi diğer siteler çalışmaya devam eder. Konteyner ayağa kalkınca yönlendirme kendiliğinden düzelir — nginx'i yeniden başlatmaya gerek yok.
3. **GoTrue rate-limit başlığı**: GoTrue, hız sınırını istemci IP'sine göre uygular; arkada nginx olduğu için gerçek IP `X-Lovevox-Client-IP` başlığıyla GoTrue'a iletilir. Bu başlık kaybolursa tüm kullanıcılar tek IP'den sayılır ve hız sınırı erken dolabilir.
4. **RLS reddi sessizdir**: politika reddedilen update/delete PostgREST'te `204` ve sıfır etkilenen satır döner (politika filtre gibi uygulanır). Testlerde "hata bekleme", hedef satırın değişmediğini doğrula (`supabase/tests` bu kuralı uygular).
