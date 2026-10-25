# Love-Vox yol haritası (2026-10-25)

Duolingo karşılaştırmasından çıkan 7 madde. Uygulama işleri Kimi işçileriyle (izole worktree, dosya sahipliği ayrık), her aşama: işçi → git ile doğrulama → Kimi incelemesi → düzeltme → entegrasyon (tam `npm run check` + web/Android derlemesi + tarayıcı/emülatör ölçümü) → push + CI → canlı.

Kullanıcı kararları (2026-10-25): yapay zekâ konuşma = **Claude API**; ses = **sunucuda ücretsiz açık kaynak model**; iOS = **şimdilik PWA**; sıralama = **takma ad + haftalık XP** (e-posta asla görünmez).

Değişmez kurallar: yayınlanmış içerik yalnız BÜYÜR (`src/content/__tests__/released.test.ts`); ders/alıştırma kimlikleri değişmez; gizli anahtarlar uygulamaya gömülmez; kişisel veri yalnız gerektiği kadar.

## 0. Tasarım: EduPilot renkleri + Duolingo'dan ayrışma (sürüyor)
- K12 temel: renk tokenları (varsayılan koyu: #0e1220 / #161c30 / #d18b63), yazı tipleri (Space Grotesk, Inter, Space Mono), düz bileşenler (3B kenar yok), numaralı ders düğümü.
- K13 ekranlar: öğrenme yolu (zikzak yerine numaralı dikey liste), ders, profil, tekrar, kurslar, onboarding.
- K14 simge: lacivert-bakır ses dalgası simgesi; Android kabuğu 0.1.4.

## 1. Dilbilgisi notları + "Neden yanlış?"
- İçerik (dil başına bir işçi, paralel): `src/content/notes/<kurs>.ts` — her ünite için Türkçe dilbilgisi notu (başlık, 2–4 bölüm, örnek cümleler); `src/content/explanations/<kurs>.ts` — alıştırma kimliğine göre kısa Türkçe açıklama (sel/fill/build öncelikli). Ayrı dosya: yayınlanmış alıştırma nesneleri değişmez.
- Arayüz: ünite başlığında "Notlar" → `/notes/[unitId]`; yanlış cevapta geri bildirimde "Neden?" açıklaması (yoksa türe göre genel ipucu).
- Kabul: her ünitenin notu var; açıklama kapsamı sel/fill/build için ≥ %90; dil incelemesinden geçer.

## 2. Diyalog ve hikâyeler — ✅ tamam (2026-10-25)
- Her ünitenin sonuna 1 kısa hikâye/diyalog: konuşmacılı satırlar, seslendirme, 3–4 anlama sorusu. Yeni içerik dosyası `src/content/stories/<kurs>.ts` + yeni ekran `/story/[id]`; yolda ünite sonunda düğüm. Tamamlama XP verir, ilerlemeye (ayrı anahtar) yazılır.
- Kabul: 5 kurs × tüm üniteler; dil incelemesi; çevrimdışı çalışır.

## 3. Günlük görevler, arkadaşlar, haftalık sıralama — ✅ tamam (2026-10-25)
- Günlük görevler (yerel, cihazda): 3 görev/gün (XP, ders sayısı, hatasız ders), ödül; rozetlerle uyumlu.
- Sıralama: kullanıcı takma ad seçer; Postgres `leaderboard` tablosu (week_id, user_id, nickname, xp) — yalnız sahibi kendi satırını yazar, giriş yapmış herkes haftayı okur; e-posta hiçbir yerde tutulmaz. Arkadaş: davet kodu ile ekleme, `my_friends()` ile liste.
- Erişim kuralları **Supabase RLS** olarak `supabase/migrations/0001_lovevox.sql` içinde; testler `supabase/tests/` + `scripts/supabase-smoke.mjs` (yerel prototip).
- Kabul: RLS başka kullanıcının özel verisini açmaz; e-posta hiçbir yerde görünmez.

> **Not (2026-10-25):** backend Firebase'den self-hosted Supabase'e taşındı (`docs/SUPABASE.md`); arşiv `docs/arsiv/firebase/`.

## 4. Seviye atlama sınavı — ✅ tamam (2026-10-25)
- Her ünitenin başında "Bu üniteyi atla" → ünitenin kelime/kalıplarından 12 soruluk sınav; %80+ ise ünitenin dersleri tamamlandı sayılır (ayrı olay kaydıyla).
- Kabul: sınav rastgele ama tekrarlanabilir; başarısızlıkta ilerleme değişmez.

## 5. Öğretmen / sınıf (EduPilot bağlantısı)
- Ayrı tasarım aşaması (spec + kullanıcı onayı) gerekir: EduPilot öğretmeni sınıf kodu üretir; öğrenci Love-Vox'ta kodu girer; ilerleme özeti öğretmene EduPilot panelinde görünür. Veri yolu (Love-Vox API servisi ↔ EduPilot) ve KVKK (veli onayı, reşit olmayanlar) netleşmeden kod yok.
- EduPilot deposuna dokunan kısımlar o deponun kurallarıyla (feat dalı, kapılar, deploy.sh).

## 6. Yapay zekâ ile konuşma pratiği (Claude API)
- Küçük sunucu servisi `lovevox-api` (ayrı konteyner, `ankaxai.ai/lovevox-api/`): Supabase JWT'sini doğrular, kullanıcı başına günlük sınır, Claude API'yi çağırır; anahtar yalnız sunucuda (kullanıcı kendisi yerleştirir).
- Uygulama: ünite konusuna göre rol yapma (kafe, otel, doktor…), yazılı/sesli cevap, sonunda düzeltme ve geri bildirim (Türkçe).
- Kabul: anahtar istemciye hiç gitmez; sınır aşımı kibar mesaj; maliyet tavanı.

## 7. Doğal ses (sunucuda ücretsiz model) + iOS
- Sunucudaki GPU'da açık kaynak çok dilli TTS ile tüm hedef dil cümleleri bir kez seslendirilir → `lovevox-web/audio/<hash>.mp3`; uygulama dosya varsa onu, yoksa cihaz sesini kullanır; yavaş hız oynatma hızıyla.
- Model seçimi lisans kontrolüyle (ticari kullanıma uygun ses/model).
- iOS: şimdilik PWA (Safari → Ana Ekrana Ekle); uygulama içi rehber güncel.

## Sıra
0 (sürüyor) → 1 → 2 → 3 → 4 → 5 → 6 → 7 (kullanıcının istediği sıra). 5 sırası gelince önce kısa tasarım + kullanıcı onayı.
