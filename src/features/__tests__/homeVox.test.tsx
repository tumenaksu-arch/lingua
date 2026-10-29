/**
 * Ana sayfa Vox balonu (madde 3c): bugün ders yapılmadıysa "Bugün 1 ders
 * yapalım mı?" balonu + sallanan Vox; yapıldıysa ya da maskot ayarı kapalıysa gizli.
 */
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { DEFAULT_STATS } from '@/data';
import { localDateString } from '@/domain';
import { useAppStore } from '@/features/store';
import { useSettingsStore } from '@/ui/settingsStore';

import LearnScreen from '@/app/(tabs)/index';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 740 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

const trEn = courses.find((c) => c.id === 'tr-en')!;
const TODAY = localDateString(new Date());

beforeEach(() => {
  useSettingsStore.setState({ mascotAnimations: true, hydrated: true });
  useAppStore.setState({
    course: trEn,
    progress: {},
    stats: { ...DEFAULT_STATS, lastActiveDate: null, xpToday: 0 },
    quests: [],
    questDate: null,
  });
});

async function renderHome() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );
}

it('shows the Vox prompt when no lesson was done today', async () => {
  await renderHome();
  expect(screen.getByTestId('vox-idle')).toBeTruthy();
  expect(screen.getByText('Bugün 1 ders yapalım mı?')).toBeTruthy();
});

it('hides the prompt when a lesson was already done today', async () => {
  useAppStore.setState({ stats: { ...DEFAULT_STATS, lastActiveDate: TODAY, xpToday: 20 } });
  await renderHome();
  expect(screen.queryByTestId('vox-idle')).toBeNull();
  expect(screen.queryByText('Bugün 1 ders yapalım mı?')).toBeNull();
});

it('hides the prompt when the mascot setting is off', async () => {
  useSettingsStore.setState({ mascotAnimations: false });
  await renderHome();
  expect(screen.queryByTestId('vox-idle')).toBeNull();
  expect(screen.queryByText('Bugün 1 ders yapalım mı?')).toBeNull();
});
