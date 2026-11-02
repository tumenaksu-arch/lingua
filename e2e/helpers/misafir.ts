import { expect, type Page } from '@playwright/test';

/**
 * Misafir (hesapsız) kullanıcı kurulumu — karşılama → "Hesapsız dene" →
 * onboarding (dil: İngilizce → "Devam" → günlük hedef → "Sıfırdan başla") → sekmeler.
 * Her test yeni context ile başladığı için depolama (OPFS/IndexedDB) temizdir;
 * bu yardımcı akışı baştan kurar.
 *
 * Not: AsyncStorage web'de localStorage'dır; tema bu yardımcıdan ÖNCE
 * context.addInitScript ile yazılmalıdır.
 */

/** Karşılama ekranını açar (giriş yapmadan). */
export async function acKarsilama(page: Page) {
  await page.goto('/');
  // boot: fontlar + sqlite (OPFS) açılışı
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

/** Karşılamadan onboarding'e geçer. */
export async function hesapsizDene(page: Page) {
  await page.getByText('Hesapsız dene →').click();
  await expect(page.getByText('Hangi dili öğrenmek istiyorsun?')).toBeVisible();
}

/** Onboarding adım 1: dil seçimi ekranının görünmesini bekler (snapshot burada). */
export async function onboardingDilSecimi(page: Page) {
  await expect(page.getByText('Hangi dili öğrenmek istiyorsun?')).toBeVisible();
}

/** Onboarding'i tamamlar: İngilizce seç → Devam → günlük hedef → Sıfırdan başla → sekmeler. */
export async function misafirKur(page: Page) {
  await page.getByRole('radio', { name: /İngilizce/i }).click();
  await page.getByRole('button', { name: /^devam$/i }).click();
  await expect(page.getByText('Günlük hedefini seç')).toBeVisible();
  await page.getByRole('button', { name: /sıfırdan başla/i }).click();
  // Sekmeler ana sayfası (yol) açılır
  await expect(page.getByRole('button', { name: /ders 1/i }).first()).toBeVisible({ timeout: 15_000 });
}

/** Ders ekranında "Kontrol et"e basar; geri bildirim sheet'ini açar. */
export async function cevabiKontrolEt(page: Page) {
  await page.getByRole('button', { name: /^kontrol et$/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();
}

/** Geri bildirim sheet'inden (Harika! / Doğru cevap:) ders ekranına devam eder. */
export async function geribildirimdenDevam(page: Page) {
  await page.getByRole('button', { name: /^devam$/i }).click();
}

/** Yazı tiplerinin yüklenmesini ve ağın durulmasını bekler (snapshot öncesi). */
export async function goruntuKararli(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}
