# Lingua

Duolingo esinli, çoklu dil öğrenme mobil uygulaması (Expo SDK 57 · React Native 0.86 · TypeScript).

## Özellikler
- **Öğrenme yolu**: Bölüm → ünite → ders; 6 egzersiz türü (çeviri seç, cümle kur, eşleştir, dinle-yaz, konuş, boşluk doldur). Yanlışlar dersin sonunda tekrar sorulur.
- **Kurslar** (`src/content/`): TR→İngilizce 8 ünite / 32 ders (A1→A2), TR→Almanca ve TR→İspanyolca 4 ünite / 12 ders, TR→Fransızca 3 ünite / 9 ders.
- **Kelime kartları + aralıklı tekrar (SM‑2)**: Derslerde öğrenilen kelimeler otomatik olarak kursa özel tekrar destesine düşer.
- **Oyunlaştırma**: XP, günlük hedef, seri + seri dondurma (her 7 günde bir, en fazla 2), 5 kalp (30 dk'da bir yenilenir), pratik modu, 12 rozet, son 7 günün XP grafiği, günlük hatırlatma bildirimi.
- **Telaffuz**: `expo-speech` ile seslendirme, `expo-speech-recognition` ile cihaz üstü konuşma tanıma (development build gerekir).
- **Görünüm**: açık/koyu tema (sistem, açık, koyu), ses efektleri (kapatılabilir), erişilebilirlik (WCAG AA kontrast, ekran okuyucu etiketleri, hareket azaltma desteği).
- **Hesap + senkron**: self-hosted Supabase (ankaxai.ai sunucusu; Auth + PostgREST, erişimi Postgres RLS korur); çevrimdışı‑öncelikli SQLite + outbox senkronu. Misafir olarak oynanan ilerleme ilk girişte hesaba taşınır. (2026-10-25'e kadar Firebase.)

## Yerel makinede çalıştırma
Gereksinimler: Node 22+, Git. Telefonda denemek için **Expo Go** (App Store / Play Store).

```bash
git clone https://github.com/tumenaksu-arch/lingua.git
cd lingua
npm install
npm start            # QR kodu Expo Go ile okutun (aynı Wi‑Fi) — ya da `a` (Android emülatör) / `i` (iOS simülatör)
```
`.env` olmadan uygulama **tamamen yerel** çalışır (SQLite); hesap/senkron için `cp .env.example .env` ve Supabase URL + anon key girin (`docs/SETUP.md`, ayrıntı: `docs/SUPABASE.md`).

**Expo Go sınırı:** konuşma tanıma (`expo-speech-recognition`) native modül olduğundan Expo Go'da *Konuş* egzersizi "Şu an kullanılamıyor" der ve atlanabilir; diğer her şey çalışır. Tam özellik için geliştirme derlemesi:

```bash
# Android: Android Studio + SDK (ANDROID_HOME) ve JDK 17 kurulu olmalı
npm run android      # expo run:android — android/ klasörünü üretir, derler, emülatöre/cihaza kurar
# iOS (yalnızca macOS): Xcode + CocoaPods
npm run ios          # expo run:ios
```
Bulutta derlemek için (yerel SDK gerekmez): `npx eas-cli@latest build --profile development --platform android` (bkz. `docs/SETUP.md`).

## Komutlar
```bash
npm test          # jest
npm run typecheck # tsc --noEmit
npm run lint      # expo lint
npm run check     # lint + typecheck + test (CI ile aynı)
```

## Mimari
`docs/ARCHITECTURE.md` · Yayın/Play Store: `docs/RELEASE.md` · Devir notu: `docs/HANDOFF.md`. Katmanlar: `src/domain` (saf TS iş kuralları, testli) · `src/data` (SQLite, Supabase Auth/PostgREST, senkron) · `src/ui` (tasarım sistemi) · `src/speech` · `src/content` · `src/features` (store, ders akışı) · `src/app` (Expo Router ekranları).
