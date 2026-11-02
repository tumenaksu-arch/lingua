# G2 Ekran Tutarlılık Denetimi (salt-okunur rapor)

- **Tarih:** 2026-11-02 · **Dal:** `g2-denetim` (origin/main tabanlı)
- **Kapsam:** `src/app/(tabs)/profile.tsx`, `src/app/(tabs)/konus.tsx`, `src/app/konus/[scenarioId].tsx`, `src/app/(tabs)/league.tsx`, `src/app/(tabs)/index.tsx`, `src/app/lesson/[id].tsx`
- **Referans:** `docs/FRONTEND-TASARIM.md` **yok**. Referans olarak `src/ui/theme.ts` token'ları (`palette`, `ColorTokens`, `spacing`, `radii`, `fonts`, `MIN_TOUCH`, `MAX_FONT_SCALE_DENSE`) + `src/ui/` kataloğu (`Screen`, `Typography`, `Button`, `LevelBadge`, `StatChips`, `PathNode`, `UnitHeader`, `FeedbackSheet`…) kullanıldı.
- **En tutarlı ekran:** `(tabs)/index.tsx` — katalog bileşenlerini en yoğun kullanan ekran (`UnitHeader`, `PathNode`, `StreakFlame`, `GemChip`, `XpBadge`, `Hearts`, `XpBoostChip`, `Vox`, `ProgressBar`); sapmaları neredeyse yalnızca stil literal'lerinde (`borderRadius: 10`, `gap: 2`). `lesson/[id].tsx` ikinci sırada (`FeedbackSheet`, `Hearts`, `ProgressBar`, `Vox` düzgün; `OutOfHearts` kendi içinde tutarlı). En zayıf halka: `league.tsx` (yükleniyor/hata/boş kalıpları diğer ekranlarla hiç örtüşmüyor) ve iki özel segmented-chip kontrolünün çift implementasyonu (`profile.tsx` `Chip` ↔ `league.tsx` `Segment`).
- **Renk boyutu — iyi haber:** Altı dosyada da `grep` ile doğrulandı: token dışı literal hex (`'#…'`, `rgba(`) **yok**, `palette.*`'a doğrudan erişim **yok**; tüm ekranlar `useTheme()` üzerinden `colors.*` okuyor. Tema değişiminde renk kırılması riski taşıyan bulgu yok.

## 1. Özet tablo (sapma sayısı)

| Ekran | Başlık hiyerarşisi | Kart/yüzey | Boşluk ölçeği | Düğme varyantları | Boş/yükleniyor/hata | Renk | Erişilebilirlik | Tipografi | Toplam |
|---|---|---|---|---|---|---|---|---|---|
| `(tabs)/profile.tsx` | 1 | 4 | 1 | 1 | 0 | 0 | 2 | 1 | **10** |
| `(tabs)/konus.tsx` | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 1 | **3** |
| `konus/[scenarioId].tsx` | 0 | 2 | 2 | 1 | 0 | 0 | 1 | 2 | **8** |
| `(tabs)/league.tsx` | 0 | 0 | 2 | 0 | 3 | 0 | 1 | 1 | **7** |
| `(tabs)/index.tsx` | 0 | 4 | 1 | 1 | 0 | 0 | 0 | 0 | **6** |
| `lesson/[id].tsx` | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | **2** |
| **Toplam** | **1** | **12** | **7** | **4** | **3** | **0** | **4** | **5** | **36** |

Not: "Kart/yüzey" sütununa aynı kalıbın kopyalanması (soonCard, notice, doneCard) de dahil. 20+ somut bulgu aşağıda; satır numaralarının tamamı `grep -n` ile doğrulandı.

## 2. Bulgu tablosu

| # | dosya:satır | boyut | mevcut kod (alıntı) | önerilen | etki | emek |
|---|---|---|---|---|---|---|
| 1 | `(tabs)/profile.tsx:520` | kart/yüzey | `stat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: spacing.md, ... }` | `radii.md` (12) | küçük | S |
| 2 | `(tabs)/profile.tsx:521` | kart/yüzey | `scoreCard: { borderWidth: 1, borderRadius: 10, ... }` | `radii.md` | küçük | S |
| 3 | `(tabs)/profile.tsx:539` | kart/yüzey | `teacherRow: { ... borderRadius: 10, padding: spacing.md, minHeight: 56 }` | `radii.md` | küçük | S |
| 4 | `(tabs)/profile.tsx:545` | kart/yüzey | `borderRadius: 10,` (`badge` stili) | `radii.md` | küçük | S |
| 5 | `(tabs)/profile.tsx:526` | erişilebilirlik | `minHeight: 40,` (`chip` stili; `MIN_TOUCH=44` altı) | `Math.max(MIN_TOUCH, 40)` ya da 44 | belirgin (dokunma hedefi) | S |
| 6 | `(tabs)/profile.tsx:533` | tipografi | `chipText: { fontSize: 13, letterSpacing: 1, fontFamily: fonts.mono }` | Button etiketiyle aynı ölçek: `fontSize.xs`(12)/13 + `letterSpacing: 1.5` (`Button.tsx:122`); ya da ortak `FilterChip` bileşeni | küçük | S |
| 7 | `(tabs)/profile.tsx:138` | düğme varyantı + tipografi | `<Text style={[styles.chipText, ...]} maxFontSizeMultiplier={1.6}>{upperTr(label)}</Text>` — ham `Text`; `maxFontSizeMultiplier` yalnız bu ekranda | `Caption` tabanlı ortak `Chip`/`SegmentedControl` (`src/ui`); `MAX_FONT_SCALE_DENSE` sabitini katalogda tekelleştir | küçük | M |
| 8 | `(tabs)/profile.tsx:102` | başlık hiyerarşisi | `<Heading>{value}</Heading>` (`Stat` — sayısal değer display/20px başlık fontunda) | değer için `Body` + `fontWeight.bold` ya da `StatChips` kalıbı; `Heading` yalnız bölüm başlıklarında (lesson `[id].tsx:239` ile aynı sapma — birlikte düzeltilmeli) | küçük | S |
| 9 | `(tabs)/profile.tsx:519,535,540,548` | boşluk ölçeği | `classInfo: { gap: 2 }`, `weekCol: { ..., gap: 2, ... }`, `teacherText: { gap: 2 }`, `badge: { ..., gap: 2, ... }` | `spacing.xs` (4); 2px'lik mikro boşluk ölçeğe hiç girmiyor — ya `spacing.xs`'e çekilmeli ya da token'a `xxs: 2` eklenmeli | küçük | S |
| 10 | `(tabs)/konus.tsx:107-111` | düğme varyantı | `<View style={[styles.levelChip, ...]}><Caption ...>{s.level}</Caption></View>` — özel seviye çipi | katalogdaki `LevelBadge` bileşeni | küçük | S |
| 11 | `(tabs)/konus.tsx:133` | boşluk ölçeği | `levelChip: { ..., paddingVertical: 2 }` | `spacing.xs` | yok | S |
| 12 | `(tabs)/konus.tsx:128,134` | tipografi | `remaining: { fontFamily: fonts.mono }`, `levelText: { fontFamily: fonts.mono }` — `Caption`'a mono ekleniyor; `Caption`'ın `letterSpacing: 1.5`'i korunuyor, diğer mono etiketlerde 1 (`league.tsx:410`) ya da 1.5 (`Button`) — üç farklı değer | mono etiket için tek kalıp (ör. `Caption` + `letterSpacing: 1` sabiti katalogda) | yok | S |
| 13 | `(tabs)/konus.tsx:66` ↔ `(tabs)/league.tsx:354` ↔ `konus/[scenarioId].tsx:304` | boş/yükleniyor/hata | konus: `<ActivityIndicator ... size="large" accessibilityLabel="Yükleniyor" />`; scenario: aynı ActivityIndicator; league: `<Caption color={colors.textMuted}>Yükleniyor…</Caption>` | ortak `LoadingState` bileşeni (aktivite göstergesi + erişilebilir etiket) — 3 farklı kalıp | belirgin (lig ekranında boş gri metin) | S |
| 14 | `konus/[scenarioId].tsx:348,586` ↔ `lesson/[id].tsx:209` | düğme varyantı | scenario: `<Text style={[styles.closeText, ...]}>✕</Text>` + `closeText: { fontSize: 20 }`; lesson: `<Heading color={colors.textMuted}>✕</Heading>` | ortak `CloseButton` (44×44, `accessibilityLabel="Kapat"`); aynı eylem iki ekranda farklı bileşen/boyut | küçük | S |
| 15 | `konus/[scenarioId].tsx:594` | erişilebilirlik | `modeChip: { flex: 1, minHeight: 40, ... }` (`MIN_TOUCH=44` altı mod değiştirme hedefi) | 44 | küçük | S |
| 16 | `konus/[scenarioId].tsx:598,610,620,623` | tipografi | `doneEmoji: { fontSize: 40 }`, `voiceMicGlyph: { fontSize: 28 }`, `micGlyph: { fontSize: 20 }`, `sendGlyph: { fontSize: 20 }` | glif boyutları `fontSize` token'larına (`xxl`/`xl`/`lg`); dekoratif `Text`'ler zaten `accessible={false}` — yalnız ölçek birleştirilecek | yok | S |
| 17 | `konus/[scenarioId].tsx:621` | boşluk + tipografi | `input: { ..., paddingTop: 12, paddingBottom: 12, fontSize: 16 }` | `spacing.md` + `fontSize.md`; league input'unda da aynı (`league.tsx:416` `fontSize: 16`) | yok | S |
| 18 | `konus/[scenarioId].tsx:575` ↔ `(tabs)/konus.tsx:129` | kart/yüzey (tekilleştirme) | iki dosyada birebir aynı `soonCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' }` ve aynı "Konuşma pratiği yakında" içeriği | ortak `ComingSoonCard` / `EmptyState` bileşeni | küçük | M |
| 19 | `konus/[scenarioId].tsx:596` (kullanım: 392, 408, 413, 420, 432) | kart/yüzey (tekilleştirme) | `notice: { borderWidth: 1, borderRadius: radii.md, ... }` aynı iskelet 3 kez (uyarı/danger), `doneCard` 2 kez (sesli/yazılı) farklı içerikle | `NoticeCard` (tone: warning/danger/success prop'lu) + tek `DoneCard` | küçük | M |
| 20 | `konus/[scenarioId].tsx:624` | boşluk ölçeği | `counter: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: 2 }` | `spacing.xs`/4 ya da 0 | yok | S |
| 21 | `(tabs)/league.tsx:370` ↔ `(tabs)/konus.tsx:69-77` | boş/yükleniyor/hata | league: `{error && <Caption color={colors.dangerText}>Bir sorun oluştu: {error}</Caption>}` — retry yok; konus: hata + `Tekrar dene` outline düğmesi | ortak `ErrorState` (mesin + `onRetry` opsiyonel) — league'de yenile yalnızca başlıkta, hata bloğu yalnız metin | küçük | S |
| 22 | `(tabs)/league.tsx:252,374` | boş durum | `<Caption color={colors.textMuted}>Henüz arkadaşın yok. Kodunu paylaş, birlikte yarışın!</Caption>` / `Bu hafta için henüz kayıt yok. İlk sen ol!` — salt küçük metin; konus'ta kart, index'te banner kullanılıyor | ortak `EmptyState` (ikon + `Body` + opsiyonel `Button`) | küçük | S |
| 23 | `(tabs)/league.tsx:395-396` | boşluk + erişilebilirlik | `segment: { ..., padding: 3 }`, `segmentItem: { flex: 1, minHeight: 40, ... }` | `spacing.xs` dolgu; 44px hedef | küçük | S |
| 24 | `(tabs)/league.tsx:56,85,410,422,428` | tipografi | `segmentText: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1 }`, `xp: { fontFamily: fonts.mono, fontSize: 14, letterSpacing: 1 }`, `code: { ..., fontSize: 32, letterSpacing: 8 }`, `streakCardNumber: { ..., fontSize: 32, letterSpacing: 2 }` — ham `Text` + literal ölçüler | `Caption`/`fontSize` token'ları; mono etiket kalıbı katalogda tekelleştirilmeli (bkz. #6, #12 — dört ekranda dört varyant) | küçük | S |
| 25 | `(tabs)/league.tsx:37-64` ↔ `(tabs)/profile.tsx:109-143` | düğme varyantı (tekilleştirme) | iki ayrı özel segmented/seçim kontrolü: `Segment` (tablist/tab, mono 13/1) ve `Chip` (button, mono 13/1, haptic flag'iyle `Button` taklidi) | tek `SegmentedControl`/`FilterChip` katalog bileşeni (seçenekler + `value`/`onChange`, `accessibilityRole` tablist veya button) | belirgin (aynı rol, iki görünüm) | M |
| 26 | `(tabs)/league.tsx:408,423` | boşluk ölçeği | `rank: { width: 28 }`, `friendRowWrap: { gap: 2 }` | sabit genişlik gerekçeli olabilir; `gap: 2` → `spacing.xs` | yok | S |
| 27 | `(tabs)/index.tsx:394,395,404,405` | kart/yüzey | `questCard: { ..., borderRadius: 10, ... }`, `classCard: { ..., borderRadius: 10, ... }`, `doneBanner: { ..., borderRadius: 10, ... }`, `voxCard: { ..., borderRadius: 10, ... }` | `radii.md` (12); profildeki 10'larla aynı sapma — iki ekran birlikte | küçük | S |
| 28 | `(tabs)/index.tsx:374-383` | düğme varyantı | `claimBtn`: `<Pressable ... style={({ pressed }) => [styles.claimBtn, { borderColor: colors.primary, opacity: ... }]}><Caption ...>{upperTr('Ödülü al')}</Caption></Pressable>` + `claimBtn: { borderWidth: 1, borderRadius: 8, ... }` — `Button variant="outline" block={false}` yerine özel ince düğme | ya `Button`'a `size="compact"` varyantı eklemek ya da katalogda `GhostButton`; mevcut outline'a en yakın | küçük | S |
| 29 | `(tabs)/index.tsx:398,414` | boşluk ölçeği | `announcement: { gap: 2 }`, `lessonText: { gap: 2 }` | `spacing.xs` (bkz. #9) | yok | S |
| 30 | `(tabs)/index.tsx:167,202` | kart/yüzey (tekilleştirme) | ders ve hikâye satırında birebir aynı `chipColor` hesabı iki kez: `const chipColor = state === 'completed' ? colors.successText : state === 'active' ? colors.primaryText : colors.textMuted;` | `pathChipColor(state, colors)` yardımcısı (ör. `PathNode` yanına) | yok | S |
| 31 | `lesson/[id].tsx:335` | kart/yüzey | `chest: { borderWidth: 2, borderRadius: radii.lg, ... }` — tüm ekranlardaki kartlar `borderWidth: 1`; sandıkta 2px + `colors.warning`/`colors.primary` renkli kenarlık | ya 1px'e çekilmeli ya da "vurgulu kart" kalıbı katalogya alınmalı (şu an tek örnek) | küçük | S |
| 32 | `lesson/[id].tsx:342` | kart/yüzey | `stat: { flex: 1, borderWidth: 1, borderRadius: 10, ... }` + satır 237'de `borderColor: color` (değere göre renkli kenarlık; diğer kartlarda `colors.border`) | `radii.md`; renkli kenarlık bilinçliyse not düşülmeli, değilse `colors.border` | küçük | S |
| 33 | tüm ekranlar (`(tabs)/profile.tsx:138` hariç) | erişilebilirlik/tipografi | `maxFontSizeMultiplier` yalnızca `profile.tsx` `Chip`'inde (1.6) ve `Button`'da var; yoğun chip/satır metinlerinin (league sıra satırları, konus kartları, index ders satırları) hiçbirinde dinamik yazı üst sınırı yok | `MAX_FONT_SCALE_DENSE` katalogda ortak varsayılan yapılmalı (ör. `Typography`'a `dense` prop'u) | yok | M |

## 3. Tekilleştirme önerileri

### 3.1 Ortak durum bileşenleri (API taslağı — kod yazılmadı)

Katalogya (`src/ui/`) eklenecek dört küçük bileşen, beş ekranın tamamındaki 3'er farklı kalıbı tekilleştirir:

```
EmptyState    { icon?: string; title: string; body?: string; action?: { label: string; onPress: () => void } }
LoadingState  { label?: string }                       // ActivityIndicator + erişilebilir etiket (konus:66 kalıbı esas)
ErrorState    { message: string; onRetry?: () => void; retryLabel?: string }
NoticeCard    { tone: 'warning' | 'danger' | 'success'; children; action?: ... }
```

- **Yükleniyor:** bugün `ActivityIndicator` (konus, scenario) vs salt `Caption "Yükleniyor…"` (league:354). Tekil: `LoadingState`.
- **Hata:** konus'ta `Caption dangerText + Tekrar dene outline` (69-77), scenario'da `Body dangerText + Tekrar dene + Geri` (319-328), league'de yalnız `Caption` (370), lesson'da `Caption + Tekrar dene + Ana sayfa` (194-196). Tekil: `ErrorState` (`onRetry` opsiyonel; `onRetry` yoksa düğme çizilmez).
- **Boş durum:** league'de salt Caption (252, 374), konus'ta `soonCard` (129/575 kopya), index'te `doneBanner`. Tekil: `EmptyState` (kart iskeleti: `radii.lg`, `borderWidth: 1`, ortalanmış ikon+başlık+metin+düğme — mevcut soonCard iskeleti birebir bu).
- `scenario`'daki 3 `notice` + 2 `doneCard` kullanımı `NoticeCard`/`EmptyState`'e oturur.

### 3.2 Düğme varyant haritası

| Eylem rolü | Bugünkü dağınık kullanım | Önerilen |
|---|---|---|
| Birincil eylem (ilerle, gönder, giriş yap) | `Button variant="primary"` (tutarlı ✅) | `Button` primary — değişiklik yok |
| İkincil/yönlendirme | `Button variant="secondary"` (lesson, konus Geri) ✅ | aynı |
| Geri/vazgeç/alt eylem | `Button variant="outline"` ✅ + özel ince düğmeler: index `claimBtn` (374), league `Segment`, profile `Chip` | outline'a `size="compact"` (minHeight 44 korunarak iç dolgu küçülür) |
| Yıkıcı | `Button variant="danger"` ✅ | aynı |
| Kapat (✕) | scenario `Text fontSize:20` vs lesson `Heading` | `CloseButton` katalog bileşeni |
| Seçim/segment | profile `Chip` ↔ league `Segment` (çift implementasyon) | tek `SegmentedControl` (tablist) / `FilterChip` (wrap'li) |
| Seviye rozeti | konus özel `levelChip` (107) | `LevelBadge` (katalogda mevcut) |
| Liste kartı (dokunulur) | konus kart Pressable (95-103), profile `teacherRow` (414-425), index ders satırları (169) | `ListCard`/`PressableCard` iskeleti (borderWidth 1, `radii.md`, pressed opacity 0.8 — bugün 3 ekranda aynı kod el yazısı) |

### 3.3 Mikro-token önerisi

`gap: 2` / `paddingVertical: 2` / `paddingTop: 2` kullanımı 6 dosyada ~12 kez görülüyor; ya `spacing.xs`'e (4) çekilmeli ya da `theme.ts`'e `spacing.xxs: 2` eklenip tekilleştirilmeli. `borderRadius: 10` (9 yer) → `radii.md`. Glif/etiket `fontSize` literal'leri → `fontSize` token'ları.

## 4. Uygulama planı (3 paket, dosya çakışmasız)

**Paket A — "Kart ölçekleri" (salt stil literal'leri, en düşük risk):**
- Dosyalar: `(tabs)/profile.tsx`, `(tabs)/index.tsx`, `lesson/[id].tsx`.
- İçerik: bulgular #1-4, #27, #31, #32 (`borderRadius: 10` → `radii.md`; chest `borderWidth` kararı) + #9, #29 (`gap: 2` → `spacing.xs`).
- Beklenen snapshot değişikliği: `profile` + `index` (learn/home) + `lesson` ekran snapshot'ları; yan yana kart köşe yarıçapları 10→12 farkı görünür.
- Emek: S.

**Paket B — "Ortak durum bileşenleri + konuşma ekranları":**
- Dosyalar: yeni `src/ui/` bileşenleri (`LoadingState`, `ErrorState`, `EmptyState`/`ComingSoonCard`, `NoticeCard`) + `(tabs)/konus.tsx`, `konus/[scenarioId].tsx`, `(tabs)/league.tsx`.
- İçerik: bulgular #13, #18-23 (durum kalıpları + soonCard/notice kopyaları) + #10-12 (konus levelChip → `LevelBadge`, padding/fontSize) + #14 (kapat düğmesi ortak bileşen; `lesson/[id].tsx`'teki `Heading ✕` satırına dokunulur — tek çakışma riski Paket A'daki lesson satırları değil stil bloğu değil, güvenli) + #15, #16, #17, #20, #23, #26.
- Beklenen snapshot değişikliği: `konus` (tab + scenario) + `league` ekranları; league "Yükleniyor…" metni göstergeye dönüşür (belirgin fark), boş durumlar kartlaşır.
- Emek: M.

**Paket C — "Segment/chip + tipografi ölçeği":**
- Dosyalar: `src/ui/` (yeni `SegmentedControl`/`FilterChip`, `Typography`'a `dense`/`maxFontSizeMultiplier` desteği) + `(tabs)/profile.tsx`, `(tabs)/league.tsx`, `(tabs)/index.tsx` (claimBtn, chipColor).
- İçerik: bulgular #6, #7, #12, #24, #25, #28, #30, #33.
- Paket A ve B'den SONRA koşmalı (profile/league/index üzerinde üst üste binen satırlar var: chip stili, segment stili, claimBtn).
- Beklenen snapshot değişikliği: `profile` + `league` + `index`; segment/chip görünümü hafif değişebilir (minHeight 40→44, letterSpacing 1→1.5), claimBtn outline görünümüne yaklaşır.
- Emek: M-L.

`lesson/[id].tsx` ve `(tabs)/index.tsx` katalog uyumu zaten yüksek olduğundan Paket A sonrası bu iki ekran denetim dışı kalır; kalan sapma yükü profile/league/konus üçgenindedir.

## 5. Deterministik blok

```
Status: DONE
Commit: 17c9033
Findings: 33
Screens: 5
Notes: env — | code — | ambiguity — docs/FRONTEND-TASARIM.md yok; referans theme.ts + src/ui kataloğu + en tutarlı ekran ((tabs)/index.tsx) olarak alındı
```
