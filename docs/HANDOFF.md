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
- Backend işlerinde önce **`docs/SUPABASE.md`** okunur (mimari, migration uygulama, RLS testleri, e-posta, taşıma akışı, tuzaklar). Şema/RLS değişiklikleri `supabase/migrations/` altında SQL olarak yapılır; istemciye asla gizli anahtar girmez (anon key dışında).

## Proje özeti

| | |
|---|---|
| Depo | https://github.com/tumenaksu-arch/lingua (private), dal `main` |
| Teknoloji | Expo **SDK 57** (`expo ~57.0.30`), React Native 0.86.3, React 19.2.3, TypeScript strict, Expo Router, Zustand |
| Backend | Self-hosted **Supabase** (ankaxai.ai sunucusu): GoTrue Auth + PostgREST + Postgres/RLS; konteynerler `ankaokul` deposunda (`infra/docker-compose.yml`). 2026-10-25'e kadar Firebase `lingotr-18fbb` (arşiv: `docs/arsiv/firebase/`, proje yedek olarak duruyor) |
| Yerel veri | `expo-sqlite`; çevrimdışı-öncelikli, outbox ile PostgREST'e senkron |
| EAS | `app.json` → `extra.eas.projectId = 3e4b1660-a1ee-4248-be08-8b374107757a`; profiller `eas.json`'da (development / preview / production) |
| Android paketi | `com.tumenaksu.lingua` (eski Firebase kaydı: `google-services.json` depoda kalıyor, artık kullanılmıyor) |
| Son durum | 19 commit; 13 test dosyası / **109 test geçiyor**; lint ve tsc temiz; CI yeşil |

Ayrıntılı mimari: `docs/ARCHITECTURE.md` · Kurulum: `docs/SETUP.md` · Yayın/Play Store: `docs/RELEASE.md` · Özellik listesi: `README.md`.

### Klasör yapısı
- `src/domain/`: saf TypeScript iş kuralları, hepsi testli. SM-2 aralıklı tekrar, seri ve seri dondurma, kalpler, XP, ders durum makinesi, cevap ve konuşma puanlama, rozetler.
- `src/data/`: SQLite repo'ları, outbox, Supabase auth/remote (`remote/supabase.ts`, `auth.ts`, `supabaseRemote.ts`, `social.ts`), senkron servisi (`sync/syncService.ts`), eski Firebase taşıması (`sync/legacyMigration.ts`).
- `src/content/`: paket içi kurslar. TR→EN 8 ünite / 32 ders, TR→DE ve TR→ES 4 / 12, TR→FR 3 / 9. Mevcut ders kimliklerini **değiştirme**; kullanıcı ilerlemesi bunlara bağlı.
- `src/features/`: Zustand store (`store.ts`), ders akışı ve 6 egzersiz bileşeni, bildirimler, ses efektleri.
- `src/ui/`: tasarım sistemi. Açık/koyu tema `useTheme()` ile; `colors` dışa aktarımı açık palet olarak geriye dönük uyumluluk için duruyor.
- `src/speech/`: TTS (`expo-speech`) ve STT (`expo-speech-recognition`, Expo Go'da çökmemek için lazy yükleniyor).
- `src/app/`: Expo Router ekranları. `(tabs)/` (Öğren, Tekrar, Profil), `lesson/[id]`, `onboarding`, `auth`, `courses`.
- `supabase/migrations/0001_lovevox.sql`: RLS varsayılanı red; her satır `auth.uid()`'ye ait; `events.created_at` ve `profiles.invite_code` trigger ile kilitli; davet çözümü `resolve_invite()`, arkadaş listesi `my_friends()` fonksiyonlarıyla. RLS testleri yerel prototipe karşı (`supabase/tests/` + `scripts/supabase-smoke.mjs`): çapraz kullanıcı izolasyonu, anon erişim reddi, takma ad/davet kuralları, sıralama hakları doğrulanıyor.

## Bilinen tuzaklar (kanıtlanmış)

1. **SDK 57'de kal.** Kullanıcının telefonundaki Expo Go yalnızca SDK 57'yi destekliyor; proje bu yüzden 58'den 57'ye indirildi. `npx expo install --fix` ya da `npm audit fix --force` **çalıştırma**: paketleri SDK 58'e taşıyıp Expo Go uyumunu bozar. Paket eklerken sürümü `node_modules/expo/bundledNativeModules.json`'dan al.
2. **Sekme çubuğuna sabit `height` verme.** `BottomTabBar` özel yükseklik verilince alt güvenli alan payını eklemiyor; Android gezinme tuşları içeriğin üstüne biniyor (`6876270` ile düzeltildi). Sekme ekranlarında `Screen edges={['top']}` kullan.
3. **Konuşma tanıma Expo Go'da çalışmaz.** Native modül Expo Go'da yok; uygulama "Şu an kullanılamıyor" gösterip atlatıyor. Bu beklenen davranış. Gerçek test için EAS `development` veya `preview` derlemesi gerekir.
4. **PostgREST zaman damgaları.** `timestamptz` alanlar milisaniyesiz `'+00:00'` son ekli döner; `supabaseRemote.ts` çekilen satırları `toISOString()` ile normalize eder. Yeni istemci kodu da aynısını yapmalı.
5. **RLS reddi sessizdir.** Reddedilen update/delete `204` + sıfır etkilenen satır döner; testlerde hedef satırın değişmediğini doğrula (`supabase/tests` örnek).
6. **`.env` depoda, bilinçli olarak.** İçinde yalnızca herkese açık Supabase URL + anon key var; erişimi RLS koruyor. EAS derlemesine bu sayede giriyor. Gizli anahtarlar (JWT secret, DB parolası, service key) yalnızca sunucudadır.
7. **nginx lazy resolver + `X-Lovevox-Client-IP`.** `ankaxai.ai` nginx'i lovevox konteynerlerini tembel çözümler (konteynerler kapalıyken diğer siteler çalışır); GoTrue hız sınırı için istemci IP'si bu başlıkla iletilir — başlık kaybolursa tüm kullanıcılar tek IP'den sayılır (bkz. `docs/SUPABASE.md` §tuzaklar).
6. Jest kurulumu: `jest.setup.js` AsyncStorage, expo-haptics, expo-audio, expo-speech, reanimated ve worklets'i mock'luyor. RNTL 14 tamamen async (`await render`, `await fireEvent.press`).

## Açık işler (öncelik sırasıyla)

1. **EAS `preview` derlemesinin sonucu bilinmiyor.** Kullanıcı kendi bilgisayarından `eas build -p android --profile preview` çalıştırdı; sonucu henüz paylaşmadı. Kullanıcıdan terminal çıktısını veya expo.dev → lingua → Builds sayfasını iste; hata varsa düzelt. Slug uyuşmazlığı çıkarsa expo.dev'deki proje adı ile `app.json` `slug: "lingua"` karşılaştırılmalı.
2. **Gerçek cihazda doğrulanmadı:** bildirim hatırlatması, ses efektleri, koyu tema, konuşma tanıma (APK'da), alt güvenli alan düzeltmesi. APK kurulunca kullanıcıyla tek tek doğrula.
3. **Bulut senkronu canlıda doğrulanmalı.** Kullanıcı uygulamada hesap açıp ders bitirince sunucuda kendi satırlarının (`user_stats`, `user_progress`, ...) oluştuğunu ve ikinci cihazdan girişte çekildiğini doğrula.
4. **GitHub `EXPO_TOKEN` secret'ı** eklenip eklenmediği bilinmiyor. `eas-build.yml` iş akışı token yoksa açık bir mesajla durur.
5. **Play Store hazırlığı** (`docs/RELEASE.md`): gizlilik politikası URL'si, veri güvenliği formu, içerik derecelendirmesi, iç test kanalı.
6. İnceleme sırasında not edilip ertelenen düşük öncelikli konular:
   - `finishLesson` dört ayrı transaction'da çalışıyor; tek transaction'a alınabilir.
   - 3 günlük boşlukta 2 seri dondurma kullanılmıyor (yalnızca 2 günlük boşlukta 1 tane kullanılıyor).
   - Profilin içerik kartı kenarlıkları dekoratif ve düşük kontrastlı (1.26:1).

## Kimlik bilgileri

Bu dosyada parola, token veya yetkilendirme kodu **yok** ve olmamalı. Supabase gizli anahtarları (JWT secret, DB parolası, service key) yalnızca sunucudadır (`~/ankaokul-secrets/lovevox-supabase.env` ve `ankaokul/infra/.env`); istenirse kullanıcı sunucuda kendisi yerleştirir, sohbete asla yazılmaz. Expo erişimi gerekirse: kullanıcı expo.dev'de Access Token oluşturup GitHub'a `EXPO_TOKEN` secret'ı olarak eklesin ya da sunucunun ortam değişkenine koysun. Token'ı sohbete yapıştırmasını isteme.

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
