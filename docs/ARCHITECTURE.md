# Lingua — Sistem Tasarımı (ADR-001)

Referans ürün: **Duolingo**. Hedef: çoklu dil (ör. TR→EN/DE/ES), hesap + bulut senkron, çevrimdışı çalışan ders akışı.

## 1. Gereksinimler
**Fonksiyonel**
- Öğrenme yolu: Bölüm → Ünite → Ders (Duolingo "path"). Ders = 8–12 egzersiz.
- Egzersiz türleri: `select_translation`, `translate_build` (kelime bloklarından cümle), `match_pairs`, `listen_type` (TTS), `speak` (STT), `fill_blank`.
- Kelime kartları + aralıklı tekrar (SM‑2; her kelime için `due_at`).
- Oyunlaştırma: XP, günlük hedef, seri (streak) + seri dondurma, kalp (hearts, 5 → hata başına −1, zamanla yenilenir).
- Hesap: e‑posta/şifre (Firebase Authentication); ilerleme Cloud Firestore'da.

**Fonksiyonel olmayan**
- Çevrimdışı‑öncelikli: tüm yazmalar önce SQLite'a, sonra senkron kuyruğu ile Firestore'a.
- Ders içi gecikme < 16 ms/frame (animasyonlar Reanimated, JS thread'de ağır iş yok).
- Tek kişilik ekip → yönetilen backend (Firebase), sunucu kodu yok.

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
│  data/remote (firebase: Auth, Firestore)             │
└──────────────────────────┬───────────────────────────┘
                           │ HTTPS (Firebase SDK)
                   ┌───────▼────────┐
                   │ Firebase       │ Auth (e‑posta/şifre)
                   │ Firestore:     │ users/{uid}/stats|progress|srs|events
                   │ (içerik yok;   │ firestore.rules: yalnızca sahibi
                   │  pakette)      │
                   └────────────────┘
```
Veri akışı: Ders biter → `domain` sonucu hesaplar (XP, streak, SRS güncellemeleri) → `data/local` tek transaction'da yazar + `outbox` satırı ekler → `SyncService` çevrimiçi olunca outbox'ı Firestore'a (batch `set` + merge) push eder, sunucudan `updated_at > last_sync` belgelerini pull eder (son‑yazan‑kazanır, SRS için `max(reps)`; bekleyen outbox kaydı olan belgeler pull'da atlanır).

## 3. Veri modeli (özet)
- İçerik (kurs/ünite/ders/egzersiz/kelime) uygulama paketinde (`src/content`), yerel SQLite'a aynalanabilir; sunucuda tutulmaz.
- Firestore: `users/{uid}/stats/current`, `users/{uid}/progress/{lessonId}`, `users/{uid}/srs/{vocabId}`, `users/{uid}/events/{eventId}`; alanlar snake_case, zaman damgaları ISO string.
- Erişim: yalnızca `request.auth.uid == uid`; her belge create/update'te şema doğrulayıcıdan geçer (`firestore.rules`).

## 4. Trade‑off'lar
| Karar | Alternatif | Neden |
|---|---|---|
| Firebase (Auth + Firestore) | Supabase / kendi API | Sıfır sunucu; Web SDK Expo Go'da çalışır; kurallar belge‑bazlı doğrulama yapar. Bedeli: iş kuralları istemcide, sorgular kısıtlı |
| SQLite + outbox | Sadece online | Ders ortasında bağlantı kopsa ilerleme kaybolmaz |
| SM‑2 | FSRS | Basit, test edilebilir; FSRS'e geçiş `domain/srs` arkasında izole |
| Zustand | Redux | Küçük API, ekran başına store |
| expo-speech-recognition | Bulut STT | Cihaz üstü, ücretsiz, gizlilik; doğruluk sınırlı (eşleşme toleranslı) |

## 5. Büyüyünce gözden geçirilecekler
Lig/arkadaş sistemi (realtime), içerik CMS, FSRS, bulut TTS kalitesi, A/B için event pipeline.
