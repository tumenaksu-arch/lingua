import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { usePwaInstall } from '../pwa';

// Browser globals are stubbed loosely; the hook only reads the fields it needs.
const g = globalThis as unknown as Record<string, any>;
const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const setUA = (userAgent: string, maxTouchPoints = 0) =>
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent, maxTouchPoints }, configurable: true });

beforeEach(() => {
  setOS('web');
  g.matchMedia = () => ({ matches: false });
  g.addEventListener = jest.fn();
  g.removeEventListener = jest.fn();
  setUA('Mozilla/5.0 (Windows NT 10.0) Firefox/130.0');
});

afterEach(() => {
  setOS(originalOS);
  for (const k of ['matchMedia', 'addEventListener', 'removeEventListener', '__linguaInstallPrompt', 'Capacitor']) delete g[k];
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
});

test('native (Expo) builds have nothing to install', async () => {
  setOS('android');
  const { result } = await renderHook(() => usePwaInstall());
  expect(result.current.state).toBe('unavailable');
});

test('inside the Android shell or an installed PWA window it reports installed', async () => {
  g.Capacitor = { isNativePlatform: () => true, Plugins: {} };
  expect((await renderHook(() => usePwaInstall())).result.current.state).toBe('installed');
  delete g.Capacitor;
  g.matchMedia = (q: string) => ({ matches: q === '(display-mode: standalone)' });
  expect((await renderHook(() => usePwaInstall())).result.current.state).toBe('installed');
});

test('iPhone Safari gets the Share → Ana Ekrana Ekle path; other browsers the manual path', async () => {
  setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1');
  expect((await renderHook(() => usePwaInstall())).result.current.state).toBe('ios');
  setUA('Mozilla/5.0 (Windows NT 10.0) Firefox/130.0');
  expect((await renderHook(() => usePwaInstall())).result.current.state).toBe('manual');
});

test('a captured install prompt installs with one tap and is used only once', async () => {
  const prompt = { prompt: jest.fn(() => Promise.resolve()), userChoice: Promise.resolve({ outcome: 'accepted' as const }) };
  g.__linguaInstallPrompt = prompt;
  const { result } = await renderHook(() => usePwaInstall());
  expect(result.current.state).toBe('installable');
  let ok = false;
  await act(async () => {
    ok = await result.current.install();
  });
  expect(prompt.prompt).toHaveBeenCalledTimes(1);
  expect(ok).toBe(true);
  expect(result.current.state).toBe('installed');
  expect(g.__linguaInstallPrompt).toBeUndefined();
});
