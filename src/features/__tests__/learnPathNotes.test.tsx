import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { DEFAULT_STATS } from '@/data';
import { useAppStore } from '@/features/store';

import LearnScreen from '@/app/(tabs)/index';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

const mockPush = router.push as jest.Mock;
const trEn = courses.find((c) => c.id === 'tr-en')!;

beforeEach(() => {
  mockPush.mockClear();
  useAppStore.setState({
    course: trEn,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
  });
});

it('shows a "… notları" chip per unit and navigates to the notes route', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );

  const chip = screen.getByRole('button', { name: 'Temeller notları' });
  expect(chip).toBeTruthy();

  await fireEvent.press(chip);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/notes/[unitId]', params: { unitId: 'tr-en.u1' } });
});

it('renders no notes chip for a unit without a note', async () => {
  useAppStore.setState({
    course: {
      ...trEn,
      units: [{ ...trEn.units[0], id: 'tr-xx.u1', title: 'Notsuz bölüm' }, ...trEn.units.slice(1)],
    },
  });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );

  expect(screen.queryByRole('button', { name: 'Notsuz bölüm notları' })).toBeNull();
  // positive check: only the replaced unit lost its chip — 11 of 12 units still have one
  expect(screen.queryAllByRole('button', { name: /notları$/ })).toHaveLength(11);
  // the real units still show their chips
  expect(screen.getByRole('button', { name: 'Yemek notları' })).toBeTruthy();
});
