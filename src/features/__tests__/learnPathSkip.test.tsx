/**
 * Home-path "Atla" chip (roadmap item 4): every unit whose lessons are not all
 * completed offers a compact "Atla" chip next to "Notlar"; pressing it shows
 * the exam confirm and only then opens /skip/[unitId]. Completed units show
 * no chip.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { DEFAULT_STATS } from '@/data';
import { useAppStore } from '@/features/store';
import { showAlert } from '@/ui/alert';

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

jest.mock('@/ui/alert', () => ({ showAlert: jest.fn() }));

const mockPush = router.push as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;
const trEn = courses.find((c) => c.id === 'tr-en')!;
const u1 = trEn.units[0]!;

beforeEach(() => {
  mockPush.mockClear();
  mockShowAlert.mockClear();
  useAppStore.setState({
    course: trEn,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
  });
});

it('shows an "… ünitesini atla" chip per uncompleted unit and opens the exam after the confirm', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );

  const chip = screen.getByRole('button', { name: 'Temeller ünitesini atla' });
  expect(chip).toBeTruthy();

  await fireEvent.press(chip);
  expect(mockShowAlert).toHaveBeenCalledTimes(1);
  const [title, message, buttons] = mockShowAlert.mock.calls[0]!;
  expect(title).toBe('Ünite atlama sınavı');
  expect(String(message)).toContain('%80');
  expect(mockPush).not.toHaveBeenCalled(); // the route only opens after the confirm

  const start = (buttons as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Sınava başla')!;
  start.onPress!();
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/skip/[unitId]', params: { unitId: 'tr-en.u1' } });
});

it('renders no skip chip for a fully completed unit', async () => {
  useAppStore.setState({
    progress: Object.fromEntries(
      u1.lessons.map((l) => [l.id, { lessonId: l.id, crowns: 1, completedAt: Date.now() }]),
    ),
  });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );

  expect(screen.queryByRole('button', { name: 'Temeller ünitesini atla' })).toBeNull();
  // the other units still offer the chip (all units except the completed first one)
  expect(screen.queryAllByRole('button', { name: /ünitesini atla$/ })).toHaveLength(trEn.units.length - 1);
});
