import AsyncStorage from '@react-native-async-storage/async-storage';

import { SLOW_RATES, useSettingsStore } from '../settingsStore';

function resetStore() {
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, voice: 'dogal', hydrated: false });
}

describe('settingsStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetStore();
  });

  it('defaults slowRate to 0.6', () => {
    expect(useSettingsStore.getState().slowRate).toBe(0.6);
  });

  it('exposes the allowed SLOW_RATES', () => {
    expect(SLOW_RATES).toEqual([0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  });

  it('snaps setSlowRate to the nearest allowed value', async () => {
    await useSettingsStore.getState().setSlowRate(0.43);
    expect(useSettingsStore.getState().slowRate).toBe(0.4);
  });

  it('defaults relaxedHearts to false', () => {
    expect(useSettingsStore.getState().relaxedHearts).toBe(false);
  });

  it('persists the FULL settings object after setSlowRate', async () => {
    await useSettingsStore.getState().setSlowRate(0.5);
    const stored = JSON.parse((await AsyncStorage.getItem('settings_v1'))!);
    expect(stored).toEqual({ soundEnabled: true, slowRate: 0.5, relaxedHearts: false, voice: 'dogal' });
  });

  it('persists relaxedHearts together with soundEnabled and slowRate (no erase regression)', async () => {
    await useSettingsStore.getState().setSlowRate(0.4);
    await useSettingsStore.getState().setSoundEnabled(false);
    await useSettingsStore.getState().setRelaxedHearts(true);

    // re-hydrate a fresh store state from storage: every field must survive
    resetStore();
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().relaxedHearts).toBe(true);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(useSettingsStore.getState().slowRate).toBe(0.4);

    // and toggling one setting never erases the others
    await useSettingsStore.getState().setRelaxedHearts(false);
    const stored = JSON.parse((await AsyncStorage.getItem('settings_v1'))!);
    expect(stored).toEqual({ soundEnabled: false, slowRate: 0.4, relaxedHearts: false, voice: 'dogal' });
  });

  it('hydrates legacy data without relaxedHearts: relaxedHearts false', async () => {
    await AsyncStorage.setItem('settings_v1', JSON.stringify({ soundEnabled: false, slowRate: 0.5 }));
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().relaxedHearts).toBe(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(useSettingsStore.getState().slowRate).toBe(0.5);
  });

  it('persists BOTH soundEnabled and slowRate after setSoundEnabled (no erase regression)', async () => {
    await useSettingsStore.getState().setSlowRate(0.4);
    await useSettingsStore.getState().setSoundEnabled(false);

    // re-hydrate a fresh store state from storage: both fields must survive
    resetStore();
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().slowRate).toBe(0.4);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
  });

  it('hydrates legacy data without slowRate: soundEnabled kept, slowRate 0.6', async () => {
    await AsyncStorage.setItem('settings_v1', JSON.stringify({ soundEnabled: false }));
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(useSettingsStore.getState().slowRate).toBe(0.6);
  });

  it('hydrate restores an invalid stored slowRate to 0.6', async () => {
    await AsyncStorage.setItem('settings_v1', JSON.stringify({ soundEnabled: true, slowRate: 9 }));
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().slowRate).toBe(0.6);
  });

  it('defaults voice to dogal', () => {
    expect(useSettingsStore.getState().voice).toBe('dogal');
  });

  it('hydrates legacy data without voice: voice dogal', async () => {
    await AsyncStorage.setItem('settings_v1', JSON.stringify({ soundEnabled: false, slowRate: 0.5, relaxedHearts: true }));
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().voice).toBe('dogal');
    expect(useSettingsStore.getState().relaxedHearts).toBe(true);
  });

  it('hydrates a stored voice=cihaz', async () => {
    await AsyncStorage.setItem(
      'settings_v1',
      JSON.stringify({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, voice: 'cihaz' }),
    );
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().voice).toBe('cihaz');
  });

  it('persists the FULL settings object after setVoice', async () => {
    await useSettingsStore.getState().setVoice('cihaz');
    expect(useSettingsStore.getState().voice).toBe('cihaz');
    const stored = JSON.parse((await AsyncStorage.getItem('settings_v1'))!);
    expect(stored).toEqual({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, voice: 'cihaz' });
  });
});
