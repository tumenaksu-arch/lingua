/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Alert, Platform } from 'react-native';

import { showAlert } from '../alert';

const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

// The jest environment has no browser dialogs; install stubs the web path can call.
const g = globalThis as { confirm?: (text: string) => boolean; alert?: (text: string) => void };
beforeEach(() => {
  g.confirm = jest.fn(() => false);
  g.alert = jest.fn();
});

afterEach(() => {
  setOS(originalOS);
  delete g.confirm;
  delete g.alert;
  jest.restoreAllMocks();
});

describe('showAlert on the web (react-native-web Alert.alert is a no-op)', () => {
  const buttons = () => {
    const cancel = jest.fn();
    const confirm = jest.fn();
    return { cancel, confirm, list: [{ text: 'Vazgeç', style: 'cancel' as const, onPress: cancel }, { text: 'Çık', style: 'destructive' as const, onPress: confirm }] };
  };

  test('confirming runs the destructive action (e.g. sign out)', () => {
    setOS('web');
    const ask = jest.mocked(g.confirm!).mockReturnValue(true);
    const b = buttons();
    showAlert('Çıkış', 'Hesaptan çıkılsın mı?', b.list);
    expect(ask).toHaveBeenCalledWith('Çıkış\n\nHesaptan çıkılsın mı?');
    expect(b.confirm).toHaveBeenCalledTimes(1);
    expect(b.cancel).not.toHaveBeenCalled();
  });

  test('dismissing runs the cancel action only', () => {
    setOS('web');
    jest.mocked(g.confirm!).mockReturnValue(false);
    const b = buttons();
    showAlert('Dersi bırak?', 'İlerlemen kaydedilmeyecek.', b.list);
    expect(b.confirm).not.toHaveBeenCalled();
    expect(b.cancel).toHaveBeenCalledTimes(1);
  });

  test('a single-button notice uses window.alert and then runs its action', () => {
    setOS('web');
    const notice = g.alert!;
    const ack = jest.fn();
    showAlert('Yeni rozet!', 'İlk adım', [{ text: 'Süper', onPress: ack }]);
    expect(notice).toHaveBeenCalledWith('Yeni rozet!\n\nİlk adım');
    expect(ack).toHaveBeenCalledTimes(1);
  });
});

test('native platforms keep using Alert.alert', () => {
  setOS('android');
  const native = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  showAlert('Çıkış', 'Hesaptan çıkılsın mı?', []);
  expect(native).toHaveBeenCalledWith('Çıkış', 'Hesaptan çıkılsın mı?', []);
});

test('screens never call react-native Alert directly (it is silent on the web)', () => {
  const src = join(__dirname, '..', '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(name)) files.push(p);
    }
  };
  walk(src);
  const offenders = files
    .filter((f) => relative(src, f) !== join('ui', 'alert.ts'))
    .filter((f) => /\bAlert\.alert\(/.test(readFileSync(f, 'utf8')))
    .map((f) => relative(src, f));
  expect(offenders).toEqual([]);
});
