# Lingua — Sistem Tasarımı (ADR-001)

Referans ürün: **Duolingo**. Hedef: çoklu dil (ör. TR→EN/DE/ES), hesap + bulut senkron, çevrimdışı çalışan ders akışı.

## 1. Gereksinimler
**Fonksiyonel**
- Öğrenme yolu: Bölüm → Ünite → Ders (Duolingo "path"). Ders = 8–12 egzersiz.
- Egzersiz türleri: `select_translation`, `translate_build` (kelime bloklarından cümle), `match_pairs`, `listen_type` (TTS), `speak` (STT), `fill_blank`.
- Kelime kartları + aralıklı tekrar (SM‑2; her kelime için `due_at`).
- Oyunlaştırma: XP, günlük hedef, seri (streak) + seri dondurma, kalp (hearts, 5 → hata başına −1, zamanla yenilenir).
- Hesap: e‑posta/şifre ya da e‑posta + 6 haneli kod (self-hosted Supabase Auth/GoTrue); ilerleme sunucudaki Postgres'te (RLS korumalı). (2026-10-25'e kadar Firebase Auth/Firestore.)

**Fonksiyonel olmayan**
- Çevrimdışı‑öncelikli: tüm yazmalar önce SQLite'a, sonra senkron kuyruğu ile PostgREST'e.
- Ders içi gecikme < 16 ms/frame (animasyonlar Reanimated, JS thread'de ağır iş yok).
- Tek kişilik ekip → self-hosted Supabase (ankaxai.ai): yönetilen servis yok, tam denetim; sunucu tarafı `ankaokul` deposunda (`docs/SUPABASE.md`).

## 2. Yüksek seviye
```
┌──────────────── Expo RN uygulaması ─────────────────┐
│ src/app (expo-router)  →  features/* (ekran mantığı) │
│        ↓                        ↓                    │
│  ui/* (tasarım sistemi)   domain/* (saf TS: SRS, XP, │
│                           streak, hearts, lesson FSM)│
│        ↓                        ↓                    │
│  speech/* (expo-speech, expo-speech-recognition)     │
│  data/local  (expo-sqlite, repo'lar, outbox)         │
│  data/remote (supabase-js: Auth/GoTrue, PostgREST)   │
└──────────────────────────┬───────────────────────────┘
                           │ HTTPS (supabase-js, anon key)
                   ┌───────▼─────────────────────────┐
                   │ Self-hosted Supabase (ankaxai.ai) │ Auth (GoTrue),
                   │ Postgres + RLS:                   │ PostgREST;
                   │ user_stats, user_progress,        │ RLS: yalnızca sahibi
                   │ srs_cards, events, profiles,      │ (anon key herkese
                   │ friends, leaderboard              │  açık; RLS korur)
                   └───────────────────────────────────┘
```
Veri akışı: Ders biter → `domain` sonucu hesaplar (XP, streak, SRS güncellemeleri) → `data/local` tek transaction'da yazar + `outbox` satırı ekler → `SyncService` çevrimiçi olunca outbox'ı PostgREST'e (upsert) push eder, sunucudan `updated_at > last_sync` satırlarını pull eder (son‑yazan‑kazanır, SRS için `max(reps)`; bekleyen outbox kaydı olan satırlar pull'da atlanır).

## 3. Veri modeli (özet)
- İçerik (kurs/ünite/ders/egzersiz/kelime) uygulama paketinde (`src/content`), yerel SQLite'a aynalanabilir; sunucuda tutulmaz.
- Postgres tabloları: `user_stats`, `user_progress`, `srs_cards`, `events` (öğrenme verisi), `profiles`, `friends`, `leaderboard` (sosyal); her satır `user_id = auth.uid()`; alanlar snake_case, zaman damgaları `timestamptz`/ISO string.
- Erişim: RLS politikaları (`supabase/migrations/0001_lovevox.sql`); istemci yalnızca anon key taşır, RLS erişimi zorlar. Tablo adları yerel outbox adlarıyla birebir aynıdır.

## 4. Trade‑off'lar
| Karar | Alternatif | Neden |
|---|---|---|
| Self-hosted Supabase (Auth + Postgres/PostgREST) | Firebase / kendi API | Yönetilen servis bağımlılığı yok; SQL + RLS ile sunucu tarafı doğrulama; anon key public, erişimi RLS korur. Bedeli: altyapı sunucuda bizde (`ankaokul` deposu, `docs/SUPABASE.md`) |
| SQLite + outbox | Sadece online | Ders ortasında bağlantı kopsa ilerleme kaybolmaz |
| SM‑2 | FSRS | Basit, test edilebilir; FSRS'e geçiş `domain/srs` arkasında izole |
| Zustand | Redux | Küçük API, ekran başına store |
| expo-speech-recognition | Bulut STT | Cihaz üstü, ücretsiz, gizlilik; doğruluk sınırlı (eşleşme toleranslı) |

## 5. Büyüyünce gözden geçirilecekler
Lig/arkadaş sistemi (realtime), içerik CMS, FSRS, bulut TTS kalitesi, A/B için event pipeline.
