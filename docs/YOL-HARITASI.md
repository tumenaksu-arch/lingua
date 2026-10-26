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

## 5. Öğretmen / sınıf ✅ (2026-10-26, canlı)
- Tasarım: `docs/tasarim/madde5-ogretmen-sinif.md` (kullanıcı onaylı). Panel Love-Vox içinde (`/ogretmen`), EduPilot panelinde "Love-Vox Sınıflarım" kısayol kartı.
- Öğrenci sınıf koduyla takma adla, e-postasız (anonim hesap) katılır; öğretmen özet görür: ilerleme, ödevler, tek yönlü duyurular, zorlanılanlar, sınıf ligi.
- Şema/RLS: `supabase/migrations/0002_siniflar.sql`, `0003_sinif_duyurulari.sql`; testler `supabase/tests/classes.test.mjs`.
- Sonraya bırakılan: EduPilot Sınıf Defteri bağlantısı (ödev aktarma; öğrenciler takma adlı olduğundan sınıf düzeyinde), sınıfı olmayan eski anonim hesapların temizliği.

## 6. Yapay zekâ ile konuşma pratiği ✅ (2026-10-26, canlı — anahtar bekliyor)
- "Konuş" sekmesi: 8 senaryo × 5 dil (tanışma, kafe, yol sorma, alışveriş, otel, doktor, telefon, serbest sohbet); yanıt hedef dilde + Türkçesi + hata düzeltmesi (Türkçe açıklama); senaryo bitince 10 XP (günde senaryo başına bir kez).
- Sunucu: `server/ai` (Fastify + resmî `@anthropic-ai/sdk`, `messages.parse` + yapılandırılmış çıktı), konteyner `lovevox_ai`, yol `ankaxai.ai/lovevox-api/ai/`. Supabase JWT ile kimlik; öğrenci başına günde 30 mesaj + genel günlük tavan (göç 0004); konuşma metni saklanmaz/günlüğe yazılmaz.
- Anahtar: kullanıcı sunucu terminalinde `bash ~/ankaokul-secrets/lovevox-claude-anahtar.sh` (anahtar ekranda görünmez, doğrulanır, model seçilir, servis yeniden başlar). Anahtar yokken uygulama "yakında" gösterir.
- Bilinçli eksik: sunucu tarafı ret yedeği (fallback) `messages.parse` ile birleştirilemediği için yok; ret = nazik hata.

## 7. Doğal ses ✅ (2026-10-26, canlı)
- Sunucuda ücretsiz açık kaynak: Kokoro-82M (Apache-2.0) en/es/fr/it + Piper thorsten (motor GPL-3.0 yalnız sunucuda, ses CC0) de. Kullanıcı örnekleri dinleyip seçti (Chatterbox işlemcide çok yavaş, Piper lessac sesi yalnız-araştırma lisanslı → elendi).
- Servis `server/tts` (FastAPI), konteyner `lovevox_tts` (YALNIZ işlemci: GPU ankaokul_llm'e ayrılmış; cpus 6), yol `ankaxai.ai/lovevox-api/tts/`, mp3 disk önbelleği (4 GB LRU), kurs metinleri (3.509 cümle × hız 1.0/0.8) önceden ısıtılır: `docker exec lovevox_tts python /srv/scripts/isit.py --base-url http://127.0.0.1:8090 --input /cache/metinler.json`.
- Uygulama: Profil → Ses "Doğal (sunucu) / Cihaz sesi" (varsayılan doğal); sunucuya ulaşılamazsa cihaz sesine düşer ve 60 sn sunucuyu atlar; Profil → "Açık kaynak lisansları".
- iOS: şimdilik PWA (karar değişmedi).
## Sıra
0 (sürüyor) → 1 → 2 → 3 → 4 → 5 → 6 → 7 (kullanıcının istediği sıra). 5 sırası gelince önce kısa tasarım + kullanıcı onayı.
