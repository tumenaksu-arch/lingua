# Madde 5 — Öğretmen / Sınıf (tasarım, onay bekliyor)

Kararlar (kullanıcı, 2026-10-26):
- Tek yönlü **sınıf duyurusu** (öğretmen → sınıf, yanıt yok) eklendi; EduPilot Sınıf Defteri bağlantısı (ödev aktarma) SONRAYA bırakıldı.
- Panel Love-Vox içinde; EduPilot panelinde yalnızca kısayol kartı.
- Öğrenci takma adla ve e-postasız katılır.
- İlk sürümde dört özellik var: ilerleme özeti, ödev, zorlanılan konular, sınıf ligi.

## 1. Akış
**Öğretmen**
1. E-postalı Love-Vox hesabıyla Profil → "Öğretmen paneli"ne girer. İlk girişte kısa bir KVKK metnini onaylar.
2. "Sınıf aç" der ve sınıf adını (ör. "9-A İngilizce") ile kursu seçer.
3. "Velileri bilgilendirdim; öğrenciler yalnız takma adla katılır" kutusunu işaretlemek zorunludur.
4. Sistem 6 haneli bir sınıf kodu üretir. Kod büyük gösterilir; kopyalanabilir ve paylaşılabilir.
5. Sınıf ekranında beş sekme vardır: **Öğrenciler**, **Ödevler**, **Duyurular**, **Zorlanılanlar**, **Lig**. Duyuru en çok 500 karakterdir, düzenlenmez (silinip yeniden yazılır), öğrenciler yanıt veremez.
6. Öğretmen öğrenciyi sınıftan çıkarabilir, sınıfı arşivleyebilir (arşivlemek üyelikleri siler) ve kodu yenileyebilir.

**Öğrenci**
1. Karşılama ekranında "Sınıf koduyla katıl" der, kodu ve sınıf içi takma adını girer.
2. E-posta istenmez: Supabase'in anonim hesabı kullanılır.
3. Katılırken kısa bir bilgi gösterilir: "Öğretmenin takma adını ve ilerlemeni görecek."
4. Kurs, sınıfın kursuna ayarlanır.
5. Ana sayfada ödevler görev kartı olarak görünür (örneğin "Ödev: Ünite 3 — Cuma'ya kadar"); son duyuru da kartta gösterilir, tamamı sınıf ekranındadır.
6. Profilde "Sınıftan ayrıl ve sınıf verimi sil" seçeneği vardır.
7. Öğrenci isterse sonradan e-posta ekleyip hesabını kalıcı yapabilir. Eklemezse cihaz verisi silinince hesap kaybolur; öğretmen aynı kodla yeniden ekleyebilir.
8. Anonim öğrenciler genel Lig'de ve arkadaş sisteminde görünmez; yalnızca sınıf liginde yer alır (en az veri).

**EduPilot:** Panelde bir "Love-Vox Sınıflarım" kartı olur ve `https://ankaxai.ai/lovevox/ogretmen` adresini açar. EduPilot veritabanına dokunulmaz; değişiklik ankaokul deposunun kurallarıyla (feat dalı, kapılar, deploy.sh) yapılır.

## 2. Veri (Supabase, `supabase/migrations/0002_siniflar.sql`)
Tablolar:

| Tablo | Alanlar | Kim okur / yazar |
| --- | --- | --- |
| `teachers` | user_id, kvkk_onay_at | Yalnızca kendisi |
| `classes` | id, teacher_id, ad, course_id, join_code (benzersiz, 6 haneli), veli_bilgilendirildi (true olmak zorunda), created_at, archived_at | Yalnızca sahibi öğretmen |
| `class_members` | class_id, user_id, takma_ad (3–20 karakter), joined_at | Öğrenci kendi satırını; öğretmen kendi sınıfının üyelerini |
| `assignments` | id, class_id, unit_id, son_tarih, created_at | Öğretmen yazar; sınıf üyeleri okur |
| `class_announcements` (0003) | id, class_id, metin (1–500), created_at | Öğretmen yazar/siler; sınıf üyeleri okur; düzenleme yok |

Ayrıca:
- **Katılma:** Kod listelenemez. Katılma, `join_class(code, takma_ad)` adlı korumalı bir fonksiyonla yapılır.
- **Okuma fonksiyonları:**
  - `class_progress(class_id)`: haftalık XP, toplam XP, seri, son aktif gün, biten ders sayısı, bulunulan ünite, ödev durumu.
  - `class_struggles(class_id)`: en düşük doğruluk oranlı üniteler ve en çok yanlış yapılan alıştırma türleri.
  - `class_league(class_id)`: sınıf içi haftalık sıralama.
- **Erişim:** Bu fonksiyonlar yalnızca sınıfın öğretmenine açıktır; lig fonksiyonu sınıf üyelerine de açıktır. Öğretmen öğrencinin ham verisini (tek tek cevaplar, kartlar) görmez, yalnızca özetleri görür.
- **"Zorlanılanlar" için yeni veri:** `lesson_completed` olayına alıştırma türüne göre yanlış sayısı (`mistakes_by_type`) eklenir. Bu yalnızca bundan sonraki derslerde birikir; eski dersler yalnızca doğruluk oranıyla katkı verir.
- **Anonim giriş:** GoTrue'da anonim giriş açılır (`GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED`). Gerçek IP'ye göre hız sınırı uygulanır. Anonim kullanıcı genel lige ve arkadaş sistemine yazamaz (RLS).
- **Ödevin bitmesi:** Ünitenin tüm dersleri son tarihten önce tamamlanmış ya da atlama sınavıyla geçilmiş olmalıdır.

## 3. KVKK
- Öğrenci için ad, e-posta, telefon ya da okul numarası tutulmaz; yalnızca sınıf içi takma ad ve öğrenme özeti tutulur.
- Öğretmen sınıf açarken veli bilgilendirmesini işaretlemek zorundadır; işaretlenmeden sınıf açılamaz.
- Öğrenci "ayrıl ve sil" ile üyeliğini ve sınıfa görünen verisini siler. Arşivlenen sınıfın üyelikleri de silinir.
- Öğretmen, öğrencinin hesabına giriş yapamaz ve özet dışında veri göremez.

## 4. İş dalgaları (Kimi; her dalgada inceleme + düzeltme)
1. Göç `0002_siniflar.sql` ve RLS testleri (prototipte). Anonim giriş ayarı canlıda açılır.
2. Öğretmen paneli: `/ogretmen` rotası, sınıf aç/kod/arşiv, Öğrenciler ve Ödevler sekmeleri.
3. Öğrenci tarafı: kodla katılma (anonim), ödev kartı, sınıf ligi, ayrıl/sil.
4. Zorlanılanlar: olay verisi ve toplama fonksiyonu; EduPilot kısayol kartı (ankaokul deposunda).
5. Zorunlu denetim dalgası: güvenlik (başka sınıfın verisi, kodu tahmin etme, anonim kötüye kullanım), tarayıcıda uçtan uca test, ardından canlıya alma.

## 5. Kabul ölçütleri
- Bir öğretmen yalnızca kendi sınıflarını görür; başka bir öğretmen ya da öğrenci sınıf verisine erişemez (RLS testleri).
- Kodu bilmeyen biri sınıfa giremez. Kod tahmin denemeleri hız sınırına takılır.
- Öğrenci e-posta vermeden katılır. Öğretmenin hiçbir ekranında e-posta görünmez.
- Ödev, ünite bitince ya da atlanınca "bitti" görünür. Son tarih geçmişse "gecikti" görünür.
- Web, Android kabuğu ve 390 px genişlikte doğrulanır.
