# Kurulum: Supabase ve EAS

Backend: **self-hosted Supabase** (ankaxai.ai sunucusu; GoTrue Auth + PostgREST + Postgres/RLS). Kurulum, konteynerler, nginx yönlendirmeleri, migration uygulama ve yedekleme: **`docs/SUPABASE.md`** (sunucu tarafı `ankaokul` deposunda). 2026-10-25'e kadar Firebase (`lingotr-18fbb`) kullanılıyordu; arşiv `docs/arsiv/firebase/`.

## 1. İstemci yapılandırması
Uygulama `supabase-js` kullanır (Expo Go ile uyumlu). `.env.example`'ı kopyalayın:
```bash
cp .env.example .env
```
İki değer girilir: `EXPO_PUBLIC_SUPABASE_URL` (ör. `https://ankaxai.ai/lovevox-api`) ve `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Anon key gizli değildir; erişimi Postgres RLS politikaları (`supabase/migrations/0001_lovevox.sql`) korur. Bu değerler olmadan uygulama tamamen yerel çalışır.

## 2. Sunucu tarafı (koordinatör)
Şema/migration değişiklikleri sunucuda, `ankaokul` deposunun `infra/docker-compose.yml`'indeki `lovevox_*` servisleri üstünde yürütülür:
```bash
# yeni migration (sunucuda, koordinatör tarafından)
docker exec -i lovevox_db psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres < supabase/migrations/<dosya>.sql
```
Değişiklik sonrası RLS testleri ve smoke yalnızca **yerel prototipe** karşı koşulur (bkz. `docs/SUPABASE.md` §RLS testleri). Gizli anahtarlar (JWT secret, DB parolası, service key) yalnızca sunucudadır; istemciye girmez.

## 3. Veri modeli (Postgres)
```
user_stats      XP, seri, kalp, günlük hedef        (PK user_id)
user_progress   taç sayısı, tamamlanma               (PK user_id, lesson_id)
srs_cards       SM-2 kartı                           (PK user_id, vocab_id)
events          XP günlüğü (salt ekleme)             (PK user_id, id)
profiles        takma ad + davet kodu (e-posta yok)
friends         tek yönlü arkadaş listesi
leaderboard     haftalık sıralama (herkes okur, sahibi yazar)
```
Kurs içeriği uygulama paketinde (`src/content`), sunucuda tutulmaz. Senkron çevrimdışı‑öncelikli: SQLite → outbox → PostgREST (`src/data/sync/syncService.ts`); çakışmada son yazan kazanır, SRS'de daha çok tekrar yapılmış kart kazanır. Misafir olarak oynanan ilerleme ilk girişte hesaba taşınır. Eski Firebase hesapları tek seferlik taşıma ekranıyla (`src/app/migrate.tsx`) yeni hesaba aktarılır.

## EAS (development build — konuşma tanıma için zorunlu)
`expo-speech-recognition` native modül içerdiği için Expo Go'da çalışmaz. Derleme, imzalama ve mağazaya gönderme adımlarının tamamı **`docs/RELEASE.md`**'de.
Kısa yol (yerelden):
```bash
npx eas-cli@latest login
npx eas-cli@latest init                                              # projectId'yi app.json'a yazar
npx eas-cli@latest build --profile development --platform android   # dev client APK
```
GitHub'dan: `EXPO_TOKEN` secret'ını ekleyip **Actions → EAS Build → Run workflow**.
`.env` değerlerini EAS'e vermek için `eas env:create` (bkz. RELEASE.md §0).

## CI
`.github/workflows/ci.yml`: her push/PR'da lint (0 uyarı), typecheck, jest ve Android Metro bundle derlemesi.
