import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS } from '@/data';
import type { Course, Exercise } from '@/domain';
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

const ex = (id: string): Exercise => ({
  id,
  type: 'select_translation',
  promptLang: 'tr',
  prompt: id,
  options: ['a', 'b'],
  correctIndex: 0,
});

const course: Course = {
  id: 'c-test',
  fromLang: 'tr',
  toLang: 'en',
  title: 'Test kursu',
  vocab: [],
  units: [
    {
      id: 'u1',
      order: 1,
      title: 'Birim 1',
      description: 'test',
      lessons: [
        { id: 'l1', order: 1, vocabIds: [], exercises: [ex('e1')] },
        { id: 'l2', order: 2, vocabIds: [], exercises: [ex('e2')] },
      ],
    },
  ],
};

const mockPush = router.push as jest.Mock;

beforeEach(() => {
  mockPush.mockClear();
  useAppStore.setState({
    course,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 0, heartsUpdatedAt: Date.now() },
  });
});

it('with 0 hearts, tapping the active lesson opens the lesson route (no /profile redirect)', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );

  await fireEvent.press(screen.getByRole('button', { name: 'Birim 1 ders 1, başlanabilir' }));

  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/lesson/[id]', params: { id: 'l1', mode: undefined } });
  expect(mockPush).not.toHaveBeenCalledWith('/profile');
});
