import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useSystemBars } from '../systemBars';

/**
 * The Android shell's SystemBars plugin tints the window decor background behind the
 * status/navigation bars. The hook must drive it only inside the shell, follow argument changes,
 * and never throw (older shell APKs may lack the plugin).
 */
const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

function enterShell() {
  const set = jest.fn(() => Promise.resolve());
  setOS('web');
  (globalThis as { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => true,
    Plugins: { SystemBars: { set } },
  };
  return { set };
}

afterEach(() => {
  delete (globalThis as { Capacitor?: unknown }).Capacitor;
  setOS(originalOS);
  jest.clearAllMocks();
});

test('outside the shell the plugin is never called', async () => {
  const { set } = enterShell();
  setOS('android'); // Capacitor global present but not the web shell
  const { unmount } = await renderHook(() => useSystemBars('#0e1220', false));
  expect(set).not.toHaveBeenCalled();
  unmount();
});

test('inside the shell set() is called with the color/darkIcons and re-called when they change', async () => {
  const { set } = enterShell();
  const { rerender, unmount } = await renderHook(({ color, dark }: { color: string; dark: boolean }) => useSystemBars(color, dark), {
    initialProps: { color: '#0e1220', dark: false },
  });
  expect(set).toHaveBeenCalledWith({ color: '#0e1220', darkIcons: false });
  await act(async () => {
    rerender({ color: '#FFFFFF', dark: true });
  });
  expect(set).toHaveBeenCalledTimes(2);
  expect(set).toHaveBeenLastCalledWith({ color: '#FFFFFF', darkIcons: true });
  expect(() => unmount()).not.toThrow();
});

test('plugin errors are swallowed', async () => {
  const { set } = enterShell();
  set.mockRejectedValue(new Error('invalid color'));
  expect(async () => await renderHook(() => useSystemBars('#0e1220', false))).not.toThrow();
  // Let the rejected promise settle so an unhandled rejection would surface.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(set).toHaveBeenCalledWith({ color: '#0e1220', darkIcons: false });
});
