# Yayın Rehberi: EAS Build ve Google Play

Bu belge, uygulamayı Expo'nun bulut derleme servisi (**EAS Build**) ile paketleyip Google Play'e göndermenin adımlarını anlatır. Yerelde Android Studio / Xcode gerekmez.

## 0. Bir kez yapılacak hazırlık
1. https://expo.dev adresinde hesap açın (ücretsiz plan aylık sınırlı sayıda derleme verir).
2. Projeyi hesabınıza bağlayın (kök dizinde):
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init          # app.json → expo.extra.eas.projectId yazar; commit edin
   ```
3. `.env` değerleri EAS derlemesine otomatik girmez. İkisini de proje ortam değişkeni olarak ekleyin (değerler `.env` dosyasında; anon key gizli değildir, erişimi RLS korur):
   ```bash
   npx eas-cli@latest env:create --scope project --environment production --environment preview --environment development --name EXPO_PUBLIC_SUPABASE_URL --value "..." --visibility plaintext
   npx eas-cli@latest env:create --scope project --environment production --environment preview --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --visibility plaintext
   ```

## 1. GitHub'dan derleme (önerilen)
`.github/workflows/eas-build.yml` elle tetiklenen bir iş akışıdır.
1. Expo'da erişim anahtarı üretin: https://expo.dev → hesap → **Settings → Access tokens → Create**.
2. GitHub deposunda **Settings → Secrets and variables → Actions → New repository secret**: ad `EXPO_TOKEN`, değer = anahtar.
3. GitHub → **Actions → EAS Build → Run workflow** → profil ve platform seçin.
4. Derleme Expo panosunda ilerler (https://expo.dev → proje → Builds); bitince APK/AAB bağlantısı orada.

Yerelden aynı şey: `npx eas-cli@latest build --profile <profil> --platform android`.

## 2. Profiller (`eas.json`)
| Profil | Ne üretir | Ne zaman |
|---|---|---|
| `development` | **Dev client APK** (Expo Go yerine; konuşma tanıma dahil tüm native modüller çalışır). Cihaza kurup `npm start` ile bağlanın. | Geliştirme ve test |
| `preview` | İmzalı **APK**, mağaza dışı dağıtım (test kullanıcılarına doğrudan link). | Beta / arkadaşlara gönderme |
| `production` | **AAB** (Play Store formatı), `versionCode` otomatik artar (`autoIncrement`, sürüm kaynağı `remote`). | Mağaza yayını |

## 3. Sürümleme
- `app.json` → `expo.version` (kullanıcıya görünen, ör. `1.0.1`) elle artırılır.
- `android.versionCode` / `ios.buildNumber`: `cli.appVersionSource: "remote"` olduğu için EAS sunucuda tutar ve `production` profilinde her derlemede otomatik artırır; `app.json`'daki `1` yalnızca başlangıç değeridir. Play Console her yüklemede daha büyük `versionCode` ister.

## 4. Google Play Console kontrol listesi
1. https://play.google.com/console → geliştirici hesabı (tek seferlik ücret) → **Uygulama oluştur** (ad: Lingua, varsayılan dil: Türkçe, ücretsiz).
2. **Uygulama içeriği** bölümü (yayın engelleyiciler):
   - **Gizlilik politikası URL'si** zorunlu — uygulama hesap (e‑posta) ve öğrenme verisi topluyor. Basit bir sayfa yeterli (ör. GitHub Pages).
   - **Veri güvenliği** formu: e‑posta adresi (hesap yönetimi), uygulama etkinliği (ilerleme) toplandığını, kendi sunucumuzdaki (ankaxai.ai) Supabase'e şifreli iletildiğini ve kullanıcının hesabını silerek kaldırabileceğini beyan edin.
   - **İçerik derecelendirmesi** anketi (eğitim uygulaması → genelde "Herkes").
   - Hedef kitle: 13+ seçin (çocuklara yönelik değilse ek yükümlülükler azalır).
   - Reklam yok, hassas izin yok; **mikrofon** izni için kısa açıklama hazır olsun (konuşma alıştırmaları).
3. **Mağaza girişi**: kısa/uzun açıklama, 512×512 ikon (`assets/icon.png`), 1024×500 öne çıkan görsel, en az 2 telefon ekran görüntüsü.
4. **Test**: önce **Dahili test** (internal testing) track'ine AAB yükleyin, test kullanıcı e‑postalarını ekleyin; sonra kapalı/açık test; en son **Üretim**.
5. **İmzalama**: EAS ilk production derlemesinde yükleme anahtarını üretip saklar; Play Console'da **Play App Signing** açık kalsın.

## 5. Mağazaya gönderme
```bash
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest submit --platform android --latest
```
`submit` için Play Console'da bir **hizmet hesabı JSON anahtarı** gerekir (Kurulum → API erişimi); EAS ilk çalıştırmada yolunu sorar. İlk yüklemeyi Play Console'dan elle yapmak da mümkündür.

## 6. Yayın sonrası
- Çökme takibi için Sentry eklenebilir (henüz yok; eski Firebase Crashlytics artık bağlı değil).
- Küçük JS düzeltmeleri mağaza incelemesi olmadan `npx eas-cli@latest update --branch production` (EAS Update) ile gönderilebilir; native modül değişikliklerinde yeni derleme şarttır.
