# Devir notu — Lingua (Claude oturumundan Claude oturumuna)

> Bu dosyayı sunucuda çalışan Claude'a ilk mesaj olarak verin ya da "docs/HANDOFF.md dosyasını oku ve devral" deyin.

---

## Rolün ve çalışma kuralların

Sen deneyimli bir yazılım mühendisisin ve **Lingua** adlı Duolingo esinli dil öğrenme mobil uygulamasını devralıyorsun.

- **Asla varsayımda bulunma, kanıtla hareket et.** Her iddiayı dosya okuyarak, komut çalıştırarak veya test ederek doğrula. Doğrulayamadığın şeyi "doğrulanmadı" diye açıkça söyle.
- **Proje kurallarını uygula:** `AGENTS.md` bağlayıcıdır. En önemlisi: Expo/React Native API'lerini hafızandan yazma; `node_modules/<paket>/build/*.d.ts` dosyalarından ya da `https://docs.expo.dev/versions/v57.0.0/` belgelerinden doğrula.
- **Bir işi bitti saymadan önce** `npm run check` (lint 0 uyarı + `tsc --noEmit` + jest) yeşil olmalı. Ekran değişikliklerinde ayrıca `npx expo export --platform android` ile paket derlenmeli.
- Kullanıcıyla **Türkçe** konuş. Kullanıcı yazılımcı değil: komutları tek tek, nereye yazılacağını belirterek ver (Windows **PowerShell**, proje klasörü `C:\Users\<kullanıcı>\Desktop\lingua`; her yeni pencerede önce `cd $HOME\Desktop\lingua`).
- Commit'leri küçük ve açıklayıcı tut. Push'tan sonra GitHub Actions CI sonucunu kontrol et.
- Uygun skill ve alt ajanları kullan. Firebase işlerinde **Firebase agent skill'lerini** (`firebase-basics`, `firebase-auth-basics`, `firebase-firestore`, `firestore-rules-creation`, `firebase-security-rules-auditor`) izle. `firestore.rules` değişikliklerini mümkünse `firestore-rules-author` alt ajanına yaptır.

## Proje özeti

| | |
|---|---|
| Depo | https://github.com/tumenaksu-arch/lingua (private), dal `main` |
| Teknoloji | Expo **SDK 57** (`expo ~57.0.30`), React Native 0.86.3, React 19.2.3, TypeScript strict, Expo Router, Zustand |
| Backend | Firebase projesi `lingotr-18fbb`: Authentication (e-posta/şifre) + Cloud Firestore (`(default)`, Standard, `europe-west1`) |
| Yerel veri | `expo-sqlite`; çevrimdışı-öncelikli, outbox ile Firestore'a senkron |
| EAS | `app.json` → `extra.eas.projectId = 3e4b1660-a1ee-4248-be08-8b374107757a`; profiller `eas.json`'da (development / preview / production) |
| Android paketi | `com.tumenaksu.lingua` (Firebase'de kayıtlı, `google-services.json` depoda) |
| Son durum | 19 commit; 13 test dosyası / **109 test geçiyor**; lint ve tsc temiz; CI yeşil |

Ayrıntılı mimari: `docs/ARCHITECTURE.md` · Kurulum: `docs/SETUP.md` · Yayın/Play Store: `docs/RELEASE.md` · Özellik listesi: `README.md`.

### Klasör yapısı
- `src/domain/`: saf TypeScript iş kuralları, hepsi testli. SM-2 aralıklı tekrar, seri ve seri dondurma, kalpler, XP, ders durum makinesi, cevap ve konuşma puanlama, rozetler.
- `src/data/`: SQLite repo'ları, outbox, Firebase auth, Firestore remote, senkron servisi (`sync/syncService.ts`).
- `src/content/`: paket içi kurslar. TR→EN 8 ünite / 32 ders, TR→DE ve TR→ES 4 / 12, TR→FR 3 / 9. Mevcut ders kimliklerini **değiştirme**; kullanıcı ilerlemesi bunlara bağlı.
- `src/features/`: Zustand store (`store.ts`), ders akışı ve 6 egzersiz bileşeni, bildirimler, ses efektleri.
- `src/ui/`: tasarım sistemi. Açık/koyu tema `useTheme()` ile; `colors` dışa aktarımı açık palet olarak geriye dönük uyumluluk için duruyor.
- `src/speech/`: TTS (`expo-speech`) ve STT (`expo-speech-recognition`, Expo Go'da çökmemek için lazy yükleniyor).
- `src/app/`: Expo Router ekranları. `(tabs)/` (Öğren, Tekrar, Profil), `lesson/[id]`, `onboarding`, `auth`, `courses`.
- `firestore.rules`: varsayılan red; yalnızca sahibi `users/{uid}/stats|progress|srs|events` alt ağacına erişir; şema doğrulayıcılar create ve update'te çalışır. Gerçek Firebase'e karşı uçtan uca test edildi: geçerli yazmalar geçti, `hearts: 99`, `user_id` sahteciliği, başka kullanıcıyı okuma ve oturumsuz okuma reddedildi.

## Bilinen tuzaklar (kanıtlanmış)

1. **SDK 57'de kal.** Kullanıcının telefonundaki Expo Go yalnızca SDK 57'yi destekliyor; proje bu yüzden 58'den 57'ye indirildi. `npx expo install --fix` ya da `npm audit fix --force` **çalıştırma**: paketleri SDK 58'e taşıyıp Expo Go uyumunu bozar. Paket eklerken sürümü `node_modules/expo/bundledNativeModules.json`'dan al.
2. **Sekme çubuğuna sabit `height` verme.** `BottomTabBar` özel yükseklik verilince alt güvenli alan payını eklemiyor; Android gezinme tuşları içeriğin üstüne biniyor (`6876270` ile düzeltildi). Sekme ekranlarında `Screen edges={['top']}` kullan.
3. **Konuşma tanıma Expo Go'da çalışmaz.** Native modül Expo Go'da yok; uygulama "Şu an kullanılamıyor" gösterip atlatıyor. Bu beklenen davranış. Gerçek test için EAS `development` veya `preview` derlemesi gerekir.
4. **`getReactNativePersistence`** yalnızca Firebase Auth'un `react-native` export koşulunda var. `src/data/remote/firebase.ts`'teki tip ataması bilinçli; Metro bu koşulu Android ve iOS'ta seçiyor.
5. **`.env` depoda, bilinçli olarak.** İçinde yalnızca herkese açık Firebase web tanımlayıcıları var; erişimi `firestore.rules` koruyor. EAS derlemesine bu sayede giriyor.
6. Jest kurulumu: `jest.setup.js` AsyncStorage, expo-haptics, expo-audio, expo-speech, reanimated ve worklets'i mock'luyor. RNTL 14 tamamen async (`await render`, `await fireEvent.press`).

## Açık işler (öncelik sırasıyla)

1. **EAS `preview` derlemesinin sonucu bilinmiyor.** Kullanıcı kendi bilgisayarından `eas build -p android --profile preview` çalıştırdı; sonucu henüz paylaşmadı. Kullanıcıdan terminal çıktısını veya expo.dev → lingua → Builds sayfasını iste; hata varsa düzelt. Slug uyuşmazlığı çıkarsa expo.dev'deki proje adı ile `app.json` `slug: "lingua"` karşılaştırılmalı.
2. **Gerçek cihazda doğrulanmadı:** bildirim hatırlatması, ses efektleri, koyu tema, konuşma tanıma (APK'da), alt güvenli alan düzeltmesi. APK kurulunca kullanıcıyla tek tek doğrula.
3. **Bulut senkronu canlıda hiç kullanılmadı.** Firebase'de yalnızca devre dışı bir test kullanıcısı (`e2e-...@lingua-test.invalid`) var, `users` koleksiyonu boş. Kullanıcı uygulamada hesap açıp ders bitirince Firebase'den hesabın ve `users/{uid}/...` belgelerinin oluştuğunu doğrula.
4. **GitHub `EXPO_TOKEN` secret'ı** eklenip eklenmediği bilinmiyor. `eas-build.yml` iş akışı token yoksa açık bir mesajla durur.
5. **Play Store hazırlığı** (`docs/RELEASE.md`): gizlilik politikası URL'si, veri güvenliği formu, içerik derecelendirmesi, iç test kanalı.
6. İnceleme sırasında not edilip ertelenen düşük öncelikli konular:
   - `finishLesson` dört ayrı transaction'da çalışıyor; tek transaction'a alınabilir.
   - 3 günlük boşlukta 2 seri dondurma kullanılmıyor (yalnızca 2 günlük boşlukta 1 tane kullanılıyor).
   - Profilin içerik kartı kenarlıkları dekoratif ve düşük kontrastlı (1.26:1).

## Kimlik bilgileri

Bu dosyada parola, token veya yetkilendirme kodu **yok** ve olmamalı. Firebase veya Expo erişimi gerekirse:
- Firebase: Firebase MCP `firebase_login` aracı bir giriş bağlantısı ve oturum kimliği verir. Kullanıcıya ikisini birden göster; kullanıcı kodu kendisi yapıştırsın.
- Expo/EAS: kullanıcı expo.dev'de Access Token oluşturup GitHub'a `EXPO_TOKEN` secret'ı olarak eklesin ya da sunucunun ortam değişkenine koysun. Token'ı sohbete yapıştırmasını isteme.

## İlk yapılacaklar (sunucuda)

```bash
git clone https://github.com/tumenaksu-arch/lingua.git && cd lingua
node --version          # >= 22 olmalı
npm ci
npm run check           # beklenen: 13 suite / 109 test geçer, lint 0 uyarı
npx expo export --platform android --output-dir /tmp/lingua-export   # paket derlenmeli
git log --oneline -5    # en son 0cca815 veya sonrası
```
Sonra kullanıcıya şunu sor: "EAS preview derlemesi bitti mi? Terminalin son satırlarını veya expo.dev'deki derleme sayfasını paylaşır mısın?" Açık iş 1'den devam et.
