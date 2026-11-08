import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { router, usePathname } from 'expo-router';

import { useShellBackButton } from '../backButton';

jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  usePathname: jest.fn(() => '/'),
}));

const routerMock = router as unknown as { canGoBack: jest.Mock; back: jest.Mock; navigate: jest.Mock };
const usePathnameMock = usePathname as jest.Mock;

const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

type BackListener = (e: { canGoBack: boolean }) => void;

function fakeAppPlugin() {
  const listeners: Record<string, BackListener> = {};
  const remove = jest.fn(() => Promise.resolve());
  const plugin = {
    getInfo: jest.fn(() => Promise.resolve({ name: 'Love-Vox', id: 'ai.ankaxai.lovevox', build: '1', version: '1.0.0' })),
    addListener: jest.fn((event: string, cb: BackListener) => {
      listeners[event] = cb;
      return Promise.resolve({ remove });
    }),
    exitApp: jest.fn(() => Promise.resolve()),
  };
  return { listeners, plugin, remove };
}

function enterShell() {
  const shell = fakeAppPlugin();
  setOS('web');
  (globalThis as { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => true,
    Plugins: { App: shell.plugin },
  };
  return shell;
}

/** Mocked clock: the exit window is measured with Date.now() (injected as `now` in the hook). */
let now = 1_000_000_000;

/** Let the addListener promise resolve so the listener handle is stored. Microtasks only —
 *  legacy fake timers would leave a 0 ms setTimeout pending forever. */
async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderBackHook() {
  const view = await renderHook(() => useShellBackButton());
  await flushAsync();
  return view;
}

/** The shell fires the listener outside React's reach, so updates need an async act scope. */
async function press(listeners: Record<string, BackListener>) {
  await act(async () => {
    listeners.backButton({ canGoBack: false });
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  // Legacy: fakes setTimeout (hint auto-hide) without freezing Date/setImmediate, so the
  // renderer still commits; the press window is driven through the Date.now mock instead.
  jest.useFakeTimers({ legacyFakeTimers: true });
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete (globalThis as { Capacitor?: unknown }).Capacitor;
  setOS(originalOS);
  jest.clearAllMocks();
  routerMock.canGoBack.mockReturnValue(false);
  usePathnameMock.mockReturnValue('/');
  now = 1_000_000_000;
});

describe('useShellBackButton outside the shell', () => {
  test('no listener is registered on a native (non-web) build', async () => {
    const { plugin } = fakeAppPlugin();
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
      Plugins: { App: plugin },
    };
    setOS('android'); // even with a Capacitor global, isNativeShell() is false

    await renderBackHook();

    expect(plugin.addListener).not.toHaveBeenCalled();
    expect(routerMock.back).not.toHaveBeenCalled();
  });
});

describe('useShellBackButton inside the shell', () => {
  test('with a previous screen in the stack it goes back and never exits', async () => {
    routerMock.canGoBack.mockReturnValue(true);
    const { listeners, plugin } = enterShell();
    await renderBackHook();

    await press(listeners);

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(plugin.exitApp).not.toHaveBeenCalled();
  });

  test('at the root the first press shows the hint and does not exit', async () => {
    const { listeners, plugin } = enterShell();
    const { result } = await renderBackHook();
    expect(result.current).toBe(false);

    await press(listeners);

    expect(result.current).toBe(true);
    expect(plugin.exitApp).not.toHaveBeenCalled();
    expect(routerMock.back).not.toHaveBeenCalled();

    // The hint disappears on its own after ~2 s.
    await advance(2000);
    expect(result.current).toBe(false);
  });

  test('a second press within 2 s exits the app exactly once', async () => {
    const { listeners, plugin } = enterShell();
    const { result } = await renderBackHook();

    await press(listeners);
    now += 1500;
    await advance(1500);
    await press(listeners);

    expect(plugin.exitApp).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(false);
  });

  test('a second press after the 2 s window only shows the hint again', async () => {
    const { listeners, plugin } = enterShell();
    const { result } = await renderBackHook();

    await press(listeners);
    now += 2500;
    await advance(2500);
    await press(listeners);

    expect(plugin.exitApp).not.toHaveBeenCalled();
    expect(result.current).toBe(true);

    // The window restarted: a quick third press exits.
    now += 500;
    await advance(500);
    await press(listeners);
    expect(plugin.exitApp).toHaveBeenCalledTimes(1);
  });

  test('on a non-home tab back navigates to the home tab instead of exiting', async () => {
    usePathnameMock.mockReturnValue('/review');
    routerMock.canGoBack.mockReturnValue(false);
    const { listeners, plugin } = enterShell();
    await renderBackHook();

    await press(listeners);

    expect(routerMock.navigate).toHaveBeenCalledWith('/(tabs)');
    expect(plugin.exitApp).not.toHaveBeenCalled();
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  test('unmounting removes the shell listener', async () => {
    const { listeners, remove } = enterShell();
    const { unmount } = await renderBackHook();
    expect(listeners.backButton).toBeDefined();
    unmount();
    await flushAsync(); // the handle may arrive after unmount; it must still be removed

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
