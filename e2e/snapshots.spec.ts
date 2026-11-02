import { expect, test, type Page } from '@playwright/test';

import { acKarsilama, cevabiKontrolEt, goruntuKararli, hesapsizDene, misafirKur } from './helpers/misafir';

/**
 * Görsel anlık görüntü kilidi — 12 ekran × 2 tema (koyu/açık) = 24 görüntü.
 * Her test yeni context ile başlar (temiz OPFS/IndexedDB); tema
 * `localStorage.theme_preference` üzerinden addInitScript ile yazılır.
 *
 * Ekranların rotaları Expo Router akışına göre:
 * welcome (/) → onboarding → (tabs) yol (/) → ders (/lesson/tr-en.u1.l1) →
 * hikâye (/story/tr-en.u1) · notlar (/notes/tr-en.u1) · mağaza (/shop) · sekmeler.
 */

const TEMAS = ['dark', 'light'] as const;

/** Snapshot öncesi: fontlar + ağ boşta + kısa nefes. */
async function kilit(page: Page, ad: string) {
  await goruntuKararli(page);
  await expect(page).toHaveScreenshot(`${ad}.png`);
}

/** Misafir kurulumu sonrası doğrudan rota açma (SPA fallback sunucuda çalışır). */
async function git(page: Page, rota: string, beklenenMetin: string | RegExp) {
  await page.goto(rota);
  await expect(page.getByText(beklenenMetin)).toBeVisible({ timeout: 20_000 });
}

/** Yol ekranından 1 numaralı derse girer; ilk select_translation ekranını bekler. */
async function derseGir(page: Page) {
  await page.getByRole('button', { name: /ders 1/i }).first().click();
  await expect(page.getByText(/hangisi\?|ne demek\?/)).toBeVisible({ timeout: 15_000 });
}

for (const tema of TEMAS) {
  test.describe(`tema: ${tema}`, () => {
    test.beforeEach(async ({ context }) => {
      await context.addInitScript((t) => {
        localStorage.setItem('theme_preference', t);
      }, tema);
    });

    test('welcome — karşılama', async ({ page }) => {
      await acKarsilama(page);
      await expect(page.getByText('Hesapsız dene →')).toBeVisible();
      await kilit(page, `welcome-${tema}`);
    });

    test('onboarding — dil seçimi', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await kilit(page, `onboarding-${tema}`);
    });

    test('yol — sekmeler ana sayfa', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await kilit(page, `yol-${tema}`);
    });

    test('ders-sel — ilk select_translation', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await derseGir(page);
      await kilit(page, `ders-sel-${tema}`);
    });

    test('ders-geribildirim — doğru cevap sonrası sheet', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await derseGir(page);
      await page.getByRole('radio', { name: 'hello' }).click();
      await cevabiKontrolEt(page);
      await expect(page.getByRole('alert').getByText('Harika!')).toBeVisible();
      await kilit(page, `ders-geribildirim-${tema}`);
    });

    test('ders-build — ilk translate_build (cevap + kontrol)', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await derseGir(page);
      // Alıştırma 1: sel → 'hello'
      await page.getByRole('radio', { name: 'hello' }).click();
      await cevabiKontrolEt(page);
      await page.getByRole('button', { name: /^devam$/i }).click();
      // Alıştırma 2: sel → 'goodbye'
      await page.getByRole('radio', { name: 'goodbye' }).click();
      await cevabiKontrolEt(page);
      await page.getByRole('button', { name: /^devam$/i }).click();
      // Alıştırma 3: match — 4 çifti eşleştir
      const pairs: [string, string][] = [
        ['hello', 'merhaba'],
        ['yes', 'evet'],
        ['no', 'hayır'],
        ['thank you', 'teşekkür ederim'],
      ];
      for (const [en, tr] of pairs) {
        await page.getByRole('radio', { name: en }).click();
        await page.getByRole('radio', { name: tr }).click();
      }
      // Eşleştirme bitince geri bildirim sheet'i açılır
      await expect(page.getByRole('alert').getByText('Harika!')).toBeVisible();
      await page.getByRole('button', { name: /^devam$/i }).click();
      // Alıştırma 4: listen — "Hello" yaz
      await expect(page.getByText('Duyduğunu yaz')).toBeVisible();
      await page.getByLabel(/Cevabın, duyduğun cümleyi yaz/).fill('Hello');
      await cevabiKontrolEt(page);
      await page.getByRole('button', { name: /^devam$/i }).click();
      // Alıştırma 5: translate_build — "Teşekkür ederim." → Thank you
      await expect(page.getByText('Bu cümleyi çevir')).toBeVisible();
      await page.getByRole('button', { name: 'Thank' }).click();
      await page.getByRole('button', { name: 'you' }).click();
      await cevabiKontrolEt(page);
      await kilit(page, `ders-build-${tema}`);
    });

    test('hikaye — /story/tr-en.u1', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await git(page, '/story/tr-en.u1', 'Okulun İlk Günü');
      await kilit(page, `hikaye-${tema}`);
    });

    test('notlar — /notes/tr-en.u1', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await git(page, '/notes/tr-en.u1', "Selamlaşma ve 'to be'");
      await kilit(page, `notlar-${tema}`);
    });

    test('profil — Profil sekmesi', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await page.getByRole('tab', { name: /profil/i }).click();
      await expect(page.getByText('Misafir (yalnızca bu cihaz)')).toBeVisible();
      await kilit(page, `profil-${tema}`);
    });

    test('magaza — /shop', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await git(page, '/shop', 'Mağaza');
      await kilit(page, `magaza-${tema}`);
    });

    test('lig — Lig sekmesi (misafir)', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await page.getByRole('tab', { name: /lig/i }).click();
      await expect(page.getByText(/bir hesap gerekir/)).toBeVisible();
      await kilit(page, `lig-${tema}`);
    });

    test('tekrar — Tekrar sekmesi', async ({ page }) => {
      await acKarsilama(page);
      await hesapsizDene(page);
      await misafirKur(page);
      await page.getByRole('tab', { name: /tekrar/i }).click();
      await expect(page.getByText('Bugün tekrar yok ✅', { exact: true })).toBeVisible({ timeout: 15_000 });
      await kilit(page, `tekrar-${tema}`);
    });
  });
}
