import AsyncStorage from '@react-native-async-storage/async-storage';

import { SLOW_RATES, useSettingsStore } from '../settingsStore';

function resetStore() {
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, hydrated: false });
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

  it('persists BOTH soundEnabled and slowRate after setSlowRate', async () => {
    await useSettingsStore.getState().setSlowRate(0.5);
    const stored = JSON.parse((await AsyncStorage.getItem('settings_v1'))!);
    expect(stored).toEqual({ soundEnabled: true, slowRate: 0.5 });
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
});
