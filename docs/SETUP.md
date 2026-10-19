# Kurulum: Firebase ve EAS

Backend: **Firebase** (Authentication → E-posta/şifre, Cloud Firestore). Proje: `lingotr-18fbb` (`.firebaserc`).

## 1. Firebase CLI ile giriş (bir kez, kendi bilgisayarınızda)
```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use lingotr-18fbb
```

## 2. Android uygulamasını kaydet ve web yapılandırmasını al
Uygulama Firebase **Web SDK**'yı kullanır (Expo Go ile uyumlu); Android kaydı mağaza/Play entegrasyonu ve ileride native SDK için gerekir.
```bash
# Android uygulaması (paket adı app.json → android.package)
npx -y firebase-tools@latest apps:create ANDROID Lingua --package-name com.tumenaksu.lingua --project lingotr-18fbb
# Web uygulaması (SDK config buradan gelir)
npx -y firebase-tools@latest apps:create WEB lingua-web --project lingotr-18fbb
npx -y firebase-tools@latest apps:sdkconfig WEB <WEB_APP_ID> --project lingotr-18fbb
```
Çıktıdaki `apiKey`, `appId`, `messagingSenderId` değerlerini kök dizindeki `.env` dosyasına yazın (`cp .env.example .env`). Bu değerler gizli değildir; erişimi `firestore.rules` korur.

## 3. Auth sağlayıcısını ve Firestore kurallarını yayınla
`firebase.json` e-posta/şifre sağlayıcısını açar; kurallar `firestore.rules`.
```bash
npx -y firebase-tools@latest firestore:databases:list --project lingotr-18fbb   # yoksa: firestore:databases:create "(default)" --location=europe-west1
npx -y firebase-tools@latest deploy --only auth,firestore:rules --project lingotr-18fbb
```
Alternatif: Firebase Console → Authentication → Sign-in method → **Email/Password** → Enable.

## 4. Veri modeli (Firestore)
```
users/{uid}/stats/current        XP, seri, kalp, günlük hedef
users/{uid}/progress/{lessonId}  taç sayısı, tamamlanma
users/{uid}/srs/{vocabId}        SM-2 kartı
users/{uid}/events/{eventId}     XP günlüğü (salt ekleme)
```
Kurs içeriği uygulama paketinde (`src/content`), sunucuda tutulmaz. Senkron çevrimdışı‑öncelikli: SQLite → outbox → Firestore (`src/data/sync/syncService.ts`); çakışmada son yazan kazanır, SRS'de daha çok tekrar yapılmış kart kazanır. Misafir olarak oynanan ilerleme ilk girişte hesaba taşınır.

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
