# Lingua

Duolingo esinli, çoklu dil öğrenme mobil uygulaması (Expo SDK 58 · React Native · TypeScript).

## Özellikler (MVP)
- **Öğrenme yolu**: Bölüm → ünite → ders; 6 egzersiz türü (çeviri seç, cümle kur, eşleştir, dinle-yaz, konuş, boşluk doldur). Yanlışlar dersin sonunda tekrar sorulur.
- **Kelime kartları + aralıklı tekrar (SM‑2)**: Derslerde öğrenilen kelimeler otomatik olarak tekrar destesine düşer.
- **Oyunlaştırma**: XP, günlük hedef, seri (streak) + seri dondurma, 5 kalp (30 dk'da bir yenilenir), pratik modu.
- **Telaffuz**: `expo-speech` ile seslendirme, `expo-speech-recognition` ile cihaz üstü konuşma tanıma.
- **Çoklu dil**: TR→EN (3 ünite), TR→DE, TR→ES (2'şer ünite). İçerik `src/content/`.
- **Hesap + senkron (isteğe bağlı)**: Supabase Auth; çevrimdışı‑öncelikli SQLite + outbox senkronu. `.env` yoksa uygulama tamamen yerel çalışır.

## Yerel makinede çalıştırma
Gereksinimler: Node 22+, Git. Telefonda denemek için **Expo Go** (App Store / Play Store).

```bash
git clone https://github.com/tumenaksu-arch/lingua.git
cd lingua
npm install
npm start            # QR kodu Expo Go ile okutun (aynı Wi‑Fi) — ya da `a` (Android emülatör) / `i` (iOS simülatör)
```
`.env` olmadan uygulama **tamamen yerel** çalışır (SQLite); hesap/senkron için `cp .env.example .env` ve Supabase bilgilerini girin (`docs/SETUP.md`).

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
`docs/ARCHITECTURE.md`. Katmanlar: `src/domain` (saf TS iş kuralları, testli) · `src/data` (SQLite, Supabase, senkron) · `src/ui` (tasarım sistemi) · `src/speech` · `src/content` · `src/features` (store, ders akışı) · `src/app` (Expo Router ekranları).
