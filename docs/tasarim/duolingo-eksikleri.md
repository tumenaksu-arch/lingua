# Duolingo eksiklerini kapatma planı (2026-10-29)

Kullanıcı isteği: "Tüm eksiklikleri giderecek bir plan yap ve plana göre özellikleri geliştir ve ekle."
Kaynak analiz: Duolingo 2026 özellikleri ↔ Love-Vox kodu (bu oturum).

Her dalga ayrı dal, Kimi işçileriyle; dalga sonunda test + mutasyon kontrolü + web yayını.
Dosya sahipliği (SADECE / DOKUNMA) her işçi istemine yazılır; aynı dalgada iki işçi aynı dosyaya dokunmaz.

## Dalga 1 — Kişiye özel pratik
| İş | Ne | Dosyalar (sahip) |
|---|---|---|
| 1A Hatalarım + Zayıf kelimeler | Yanlış yapılan alıştırmalar cihazda saklanır (SQLite `mistakes`); Tekrar sekmesinde "Hatalarım" ve "Zayıf kelimeler" kartları; `/practice/[mode]` 10 soruluk oturum; doğru yapılan hata 2 kez üst üste doğruysa listeden düşer; XP verir. | `src/features/practice/**`, `src/app/practice/[mode].tsx`, `src/app/(tabs)/review.tsx`, `src/features/store.ts` (yalnız ekleme), `src/data/**` şema eki |
| 1B Seviye tespit sınavı | Karşılama/onboarding'de "Seviyemi bul": üniteler boyunca uyarlamalı 15–20 soru; geçilen üniteler mevcut atlama kaydıyla (`finishSkipTest` ile aynı olay) tamamlanır. | `src/features/placement/**`, `src/app/placement.tsx`, `src/app/onboarding.tsx` |
| 1C Yapay zekâ "Cevabımı açıkla" | Yanlış cevapta (hazır açıklamanın altında) "Yapay zekâ ile açıkla": sunucu `POST /v1/explain` (aynı kimlik, günlük kotadan düşer); yanıt Türkçe, kısa. Anahtar yokken düğme görünmez. | `server/ai/**`, `src/features/lesson/Explain*.tsx`, lesson geri bildirim bileşeni |

## Dalga 2 — Yeni alıştırma türleri
`listen_select` (duyduğuna dokun), `picture_select` (emoji resimli kelime seçimi), `complete_chat` (sohbeti tamamla), `read_answer` (oku-cevapla). Tür + kurucu + bileşen + derecelendirme + yanıtlanabilirlik testi; ardından 5 kursun her dersine yeni türlerden 2–3 alıştırma (dil başına bir işçi).

## Dalga 3 — Ödül ekonomisi ve maskot
Elmas (ders/görev/sandıktan kazanılır), Mağaza (seri dondurma, can doldurma, 15 dk çift XP, seri onarma — 2 gün içinde), ders sonu sandığı, arkadaşla ortak seri (Supabase göç 0006: arkadaşların görebildiği günlük etkinlik), papağan maskot "Vox" tepkileri (SVG, doğru/yanlış/seri).

## Dalga 4 — Konuşma ve ilerleme
Konuş sekmesinde sesli mod (mikrofonla konuş, yanıt doğal sesle okunur, eller serbest), ilerleme puanı (A1→A2 göstergesi, Profil), çevrimdışı ders paketi (PWA önbelleği: kurs içeriği + ön-ısıtılmış ses), Android ana ekran hatırlatıcısı yerine bildirim iyileştirmesi.

## Dalga 5 — İçerik A2
Her kursa 8 yeni ünite (u9–u16, A2), ünite başına 4 ders, yeni alıştırma türleri dahil; her ünite için not, hikâye ve açıklamalar; ses ön-ısıtma. Dil başına bir işçi + bağımsız dil incelemesi işçisi.

## Kapsam dışı (kullanıcı kararı gerekir)
- iOS yerel uygulama: önceki karar PWA (değişmedi).
- Ücretli üyelik / ödeme: fiyat ve ödeme sağlayıcı kararı kullanıcının.
- Yeni diller (Japonca, Korece, Arapça, Rusça): A2 içeriğinden sonra ayrıca istenirse.
- Android ana ekran widget'ı: Capacitor web kabuğunda yerel kod gerektirir; ayrı iş.
