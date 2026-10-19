# Lingua — Sistem Tasarımı (ADR-001)

Referans ürün: **Duolingo**. Hedef: çoklu dil (ör. TR→EN/DE/ES), hesap + bulut senkron, çevrimdışı çalışan ders akışı.

## 1. Gereksinimler
**Fonksiyonel**
- Öğrenme yolu: Bölüm → Ünite → Ders (Duolingo "path"). Ders = 8–12 egzersiz.
- Egzersiz türleri: `select_translation`, `translate_build` (kelime bloklarından cümle), `match_pairs`, `listen_type` (TTS), `speak` (STT), `fill_blank`.
- Kelime kartları + aralıklı tekrar (SM‑2; her kelime için `due_at`).
- Oyunlaştırma: XP, günlük hedef, seri (streak) + seri dondurma, kalp (hearts, 5 → hata başına −1, zamanla yenilenir).
- Hesap: e‑posta/şifre (Supabase Auth); ilerleme bulutta.

**Fonksiyonel olmayan**
- Çevrimdışı‑öncelikli: tüm yazmalar önce SQLite'a, sonra senkron kuyruğu ile Supabase'e.
- Ders içi gecikme < 16 ms/frame (animasyonlar Reanimated, JS thread'de ağır iş yok).
- Tek kişilik ekip → yönetilen backend (Supabase), sunucu kodu minimum.

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
│  data/remote (supabase-js: auth, sync)               │
└──────────────────────────┬───────────────────────────┘
                           │ HTTPS (PostgREST + Auth)
                   ┌───────▼────────┐
                   │ Supabase       │ Postgres + RLS
                   │ profiles,      │ courses/units/lessons (içerik)
                   │ progress,      │ user_progress, srs_cards, events
                   │ srs_cards      │
                   └────────────────┘
```
Veri akışı: Ders biter → `domain` sonucu hesaplar (XP, streak, SRS güncellemeleri) → `data/local` tek transaction'da yazar + `outbox` satırı ekler → `SyncService` çevrimiçi olunca outbox'ı Supabase'e push eder, sunucudan `updated_at > last_sync` kayıtlarını pull eder (son‑yazan‑kazanır, SRS için `max(reps)`).

## 3. Veri modeli (özet)
- `courses(id, from_lang, to_lang, title)`; `units(id, course_id, order, title)`; `lessons(id, unit_id, order)`; `exercises(id, lesson_id, type, payload jsonb)`; `vocab(id, course_id, term, translation, audio_hint)`.
- `user_progress(user_id, lesson_id, crowns, completed_at)`; `srs_cards(user_id, vocab_id, ease, interval_days, reps, due_at)`; `user_stats(user_id, xp, streak, last_active_date, hearts, hearts_updated_at, daily_goal)`; `events(id, user_id, type, payload, created_at)` (XP günlüğü).
- İçerik salt‑okunur public; kullanıcı tabloları RLS: `auth.uid() = user_id`.

## 4. Trade‑off'lar
| Karar | Alternatif | Neden |
|---|---|---|
| Supabase | Kendi Node API | Sıfır sunucu bakımı, Auth+RLS hazır; bedeli: karmaşık iş kuralları istemcide |
| SQLite + outbox | Sadece online | Ders ortasında bağlantı kopsa ilerleme kaybolmaz |
| SM‑2 | FSRS | Basit, test edilebilir; FSRS'e geçiş `domain/srs` arkasında izole |
| Zustand | Redux | Küçük API, ekran başına store |
| expo-speech-recognition | Bulut STT | Cihaz üstü, ücretsiz, gizlilik; doğruluk sınırlı (eşleşme toleranslı) |

## 5. Büyüyünce gözden geçirilecekler
Lig/arkadaş sistemi (realtime), içerik CMS, FSRS, bulut TTS kalitesi, A/B için event pipeline.
