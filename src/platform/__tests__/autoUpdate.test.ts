import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';

import { entryHashFromHtml, isNewerVersion, runningEntry, useAutoUpdate } from '../autoUpdate';

jest.mock('expo-router', () => ({
  usePathname: jest.fn(() => '/lovevox'),
}));

const usePathnameMock = usePathname as jest.Mock;

const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

/** Mocked clock so tests can advance past the 60s check throttle deterministically. */
let now = 1_000_000_000;

const g = globalThis as unknown as Record<string, unknown>;

const RUNNING_SRC = '/lovevox/_expo/static/js/web/entry-aaaaaa.js';

function htmlWithEntry(hash: string): string {
  return `<html><head><script src="/lovevox/_expo/static/js/web/entry-${hash}.js" defer></script></head><body></body></html>`;
}

/** Let queued promise continuations (fetch → text → compare) run inside act. */
async function flushAsync() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function stubWebPage(runningHash = 'aaaaaa') {
  const listeners: Record<string, () => void> = {};
  const reload = jest.fn();
  const documentStub = {
    visibilityState: 'visible',
    querySelector: jest.fn(() => ({ getAttribute: () => `/lovevox/_expo/static/js/web/entry-${runningHash}.js` })),
    addEventListener: jest.fn((event: string, cb: () => void) => {
      listeners[`document:${event}`] = cb;
    }),
    removeEventListener: jest.fn(),
  };
  const locationStub = { origin: 'https://ankaxai.ai', reload };
  const fetchMock = jest.fn();
  g.document = documentStub;
  g.location = locationStub;
  g.fetch = fetchMock;
  g.addEventListener = jest.fn((event: string, cb: () => void) => {
    listeners[event] = cb;
  });
  g.removeEventListener = jest.fn();
  return { listeners, reload, documentStub, fetchMock };
}

afterEach(() => {
  jest.restoreAllMocks();
  delete g.document;
  delete g.location;
  delete g.fetch;
  delete g.addEventListener;
  delete g.removeEventListener;
  setOS(originalOS);
  usePathnameMock.mockReturnValue('/lovevox');
  jest.clearAllMocks();
  now = 1_000_000_000;
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

describe('entryHashFromHtml', () => {
  test('parses the entry hash out of a deployed index.html', () => {
    expect(entryHashFromHtml(htmlWithEntry('deadbeef01'))).toBe('deadbeef01');
  });

  test('returns null when no entry script is present (dev server)', () => {
    expect(entryHashFromHtml('<html><body>dev</body></html>')).toBeNull();
  });
});

describe('isNewerVersion', () => {
  test('0.1.10 is newer than 0.1.9', () => {
    expect(isNewerVersion('0.1.10', '0.1.9')).toBe(true);
  });

  test('equal versions are not newer', () => {
    expect(isNewerVersion('0.1.9', '0.1.9')).toBe(false);
  });

  test('an older version is not newer', () => {
    expect(isNewerVersion('0.1.8', '0.1.9')).toBe(false);
  });
});

describe('runningEntry', () => {
  test('reads the hash and base path from the running entry script', () => {
    const doc = { querySelector: () => ({ getAttribute: () => RUNNING_SRC }) };
    expect(runningEntry(doc)).toEqual({ hash: 'aaaaaa', base: '/lovevox' });
  });

  test('returns null when there is no hashed entry script', () => {
    expect(runningEntry({ querySelector: () => null })).toBeNull();
  });
});

describe('useAutoUpdate on the web', () => {
  test('reloads when the deployed hash differs from the running one', async () => {
    setOS('web');
    const { reload, fetchMock } = stubWebPage();
    fetchMock.mockResolvedValue({ text: () => Promise.resolve(htmlWithEntry('bbbbbb')) });

    await renderHook(() => useAutoUpdate());
    await flushAsync();

    expect(fetchMock).toHaveBeenCalledWith('https://ankaxai.ai/lovevox/', { cache: 'no-store' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('does not reload when the deployed hash matches', async () => {
    setOS('web');
    const { reload, fetchMock } = stubWebPage();
    fetchMock.mockResolvedValue({ text: () => Promise.resolve(htmlWithEntry('aaaaaa')) });

    await renderHook(() => useAutoUpdate());
    await flushAsync();

    expect(reload).not.toHaveBeenCalled();
  });

  test('defers the reload while inside a lesson and reloads after leaving it', async () => {
    setOS('web');
    const { reload, fetchMock, listeners } = stubWebPage();
    fetchMock.mockResolvedValue({ text: () => Promise.resolve(htmlWithEntry('bbbbbb')) });
    usePathnameMock.mockReturnValue('/lovevox/lesson/ders-1');

    const { rerender } = await renderHook(() => useAutoUpdate());
    await flushAsync();
    expect(reload).not.toHaveBeenCalled();

    // Still in the lesson on a foreground event past the throttle: the check runs,
    // but the reload is deferred.
    now += 60_001;
    await act(async () => {
      listeners.focus?.();
    });
    await flushAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2); // the throttle let the check through
    expect(reload).not.toHaveBeenCalled();

    // Leaving the lesson applies the pending reload.
    usePathnameMock.mockReturnValue('/lovevox/(tabs)/home');
    await act(async () => {
      await rerender(undefined);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('checks again on foreground events, throttled to one check per minute', async () => {
    setOS('web');
    const { fetchMock, listeners } = stubWebPage();
    fetchMock.mockResolvedValue({ text: () => Promise.resolve(htmlWithEntry('aaaaaa')) });

    await renderHook(() => useAutoUpdate());
    await flushAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Immediately after: throttled away.
    await act(async () => {
      listeners.focus?.();
    });
    await flushAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Past the 60s throttle, a foreground event triggers a fresh check.
    now += 60_001;
    await act(async () => {
      listeners.focus?.();
    });
    await flushAsync();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('applies a pending reload when a slow fetch resolves after leaving the lesson', async () => {
    setOS('web');
    const { reload, fetchMock } = stubWebPage();
    usePathnameMock.mockReturnValue('/lovevox/lesson/ders-1');
    // Fetch that only resolves once we drive it manually.
    let resolveFetch: ((res: { text: () => Promise<string> }) => void) | undefined;
    fetchMock.mockImplementation(
      () => new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { rerender } = await renderHook(() => useAutoUpdate());
    await flushAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The user leaves the lesson before the slow fetch resolves.
    usePathnameMock.mockReturnValue('/lovevox/(tabs)/home');
    await act(async () => {
      await rerender(undefined);
    });
    expect(reload).not.toHaveBeenCalled();

    // The in-flight check resolves after the navigation: it must reload right away
    // (not wait for the next foreground event) because it reads the live pathname.
    await act(async () => {
      resolveFetch?.({ text: () => Promise.resolve(htmlWithEntry('bbbbbb')) });
    });
    await flushAsync();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('useAutoUpdate outside the web', () => {
  test('is a no-op on native platforms', async () => {
    setOS('android');
    const { fetchMock, reload, documentStub } = stubWebPage();

    await renderHook(() => useAutoUpdate());
    await flushAsync();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(documentStub.addEventListener).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
