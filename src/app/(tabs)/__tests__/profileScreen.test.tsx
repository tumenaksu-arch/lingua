import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS } from '@/data';
import { useAppStore } from '@/features/store';
import { useSettingsStore } from '@/ui/settingsStore';

import ProfileScreen from '../profile';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

beforeEach(() => {
  useAppStore.setState({ stats: { ...DEFAULT_STATS }, progress: {} });
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, hydrated: true });
});

async function renderProfile() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ProfileScreen />
    </SafeAreaProvider>,
  );
}

it('renders the slow-rate chips and pressing "Yavaş hız yüzde 40" sets slowRate 0.4', async () => {
  await renderProfile();

  for (const n of [30, 40, 50, 60, 70, 80]) {
    expect(screen.getByRole('button', { name: `Yavaş hız yüzde ${n}` })).toBeTruthy();
  }

  await fireEvent.press(screen.getByRole('button', { name: 'Yavaş hız yüzde 40' }));
  expect(useSettingsStore.getState().slowRate).toBe(0.4);
});

it('the "Rahat mod" switch toggles relaxedHearts', async () => {
  await renderProfile();

  const toggle = screen.getByLabelText('Rahat mod');
  expect(toggle.props.value).toBe(false);

  await fireEvent(toggle, 'valueChange', true);
  expect(useSettingsStore.getState().relaxedHearts).toBe(true);

  await fireEvent(toggle, 'valueChange', false);
  expect(useSettingsStore.getState().relaxedHearts).toBe(false);
});
