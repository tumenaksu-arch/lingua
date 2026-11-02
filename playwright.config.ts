import { defineConfig } from '@playwright/test';

// Port kuralı: E2E_PORT verilmişse o; değilse 4000 + (pid % 1000).
// Hesaplanan değeri ortam değişkenine yazarız ki webServer komutu
// (node scripts/serve-dist.js) aynı portu miras alsın — sabit port yok.
process.env.E2E_PORT ??= String(4000 + (process.pid % 1000));
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT}`;

/**
 * Görsel anlık görüntü (snapshot) kilidi — Love-Vox web, 390×844 telefon görünümü.
 * CI'da KOŞMAZ; yalnızca yerelde `npm run e2e:snap` ile.
 * Sunucu: scripts/serve-dist.js (COOP/COEP başlıklı statik sunucu, dist-web/ kökünden).
 */
export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
    },
  },
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: 'node scripts/serve-dist.js',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  projects: [
    {
      name: 'phone',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        locale: 'tr-TR',
        timezoneId: 'Europe/Istanbul',
      },
    },
  ],
});
