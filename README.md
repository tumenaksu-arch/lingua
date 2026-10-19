# Lingua

Duolingo esinli, çoklu dil öğrenme mobil uygulaması (Expo SDK 58 · React Native · TypeScript).

## Özellikler (MVP)
- **Öğrenme yolu**: Bölüm → ünite → ders; 6 egzersiz türü (çeviri seç, cümle kur, eşleştir, dinle-yaz, konuş, boşluk doldur). Yanlışlar dersin sonunda tekrar sorulur.
- **Kelime kartları + aralıklı tekrar (SM‑2)**: Derslerde öğrenilen kelimeler otomatik olarak tekrar destesine düşer.
- **Oyunlaştırma**: XP, günlük hedef, seri (streak) + seri dondurma, 5 kalp (30 dk'da bir yenilenir), pratik modu.
- **Telaffuz**: `expo-speech` ile seslendirme, `expo-speech-recognition` ile cihaz üstü konuşma tanıma.
- **Çoklu dil**: TR→EN (3 ünite), TR→DE, TR→ES (2'şer ünite). İçerik `src/content/`.
- **Hesap + senkron (isteğe bağlı)**: Supabase Auth; çevrimdışı‑öncelikli SQLite + outbox senkronu. `.env` yoksa uygulama tamamen yerel çalışır.

## Kurulum
```bash
npm install
cp .env.example .env   # isteğe bağlı: Supabase bilgileri
npx expo start         # Expo Go'da konuşma tanıma çalışmaz → development build gerekir
```
Supabase şeması: `supabase/migrations/0001_init.sql`.

## Komutlar
```bash
npm test          # jest
npm run typecheck # tsc --noEmit
npm run lint      # expo lint
```

## Mimari
`docs/ARCHITECTURE.md`. Katmanlar: `src/domain` (saf TS iş kuralları, testli) · `src/data` (SQLite, Supabase, senkron) · `src/ui` (tasarım sistemi) · `src/speech` · `src/content` · `src/features` (store, ders akışı) · `src/app` (Expo Router ekranları).
