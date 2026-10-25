import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Story } from '@/content/stories';
import { DEFAULT_STATS } from '@/data';
import type { Course } from '@/domain';
import { useAppStore } from '@/features/store';

import LearnScreen from '@/app/(tabs)/index';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockStory: Story = {
  id: 'c-test.u1.story',
  unitId: 'c-test.u1',
  title: 'Kahvede buluşma',
  setting: 'Bir kafede iki arkadaş buluşuyor.',
  characters: [{ name: 'Anna' }],
  lines: [{ speaker: 'Anna', text: 'Hello!', tr: 'Merhaba!' }],
  questions: [
    { prompt: 'Ne dedi?', options: ['Merhaba!', 'Hoşça kal!'], correctIndex: 0, explanation: 'Selam verdi.' },
  ],
};

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

jest.mock('@/content/stories', () => ({
  getUnitStory: jest.fn((unitId: string) => (unitId === 'c-test.u1' ? mockStory : undefined)),
}));

const mockPush = router.push as jest.Mock;

const course: Course = {
  id: 'c-test',
  fromLang: 'tr',
  toLang: 'en',
  title: 'Test kursu',
  vocab: [],
  units: [
    {
      id: 'c-test.u1',
      order: 1,
      title: 'Birim 1',
      description: 'test',
      lessons: [
        { id: 'c-test.u1.l1', order: 1, vocabIds: [], exercises: [] },
        { id: 'c-test.u1.l2', order: 2, vocabIds: [], exercises: [] },
      ],
    },
    {
      id: 'c-test.u2',
      order: 2,
      title: 'Bölüm iki',
      description: 'hikâyesiz',
      lessons: [{ id: 'c-test.u2.l1', order: 1, vocabIds: [], exercises: [] }],
    },
  ],
};

beforeEach(() => {
  mockPush.mockClear();
  useAppStore.setState({
    course,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
  });
});

async function renderPath() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );
}

describe('learning path story rows (roadmap item 2)', () => {
  it('locks the story row until every lesson of the unit is completed', async () => {
    await renderPath();
    const row = screen.getByRole('button', { name: 'Birim 1 hikâyesi, kilitli' });
    expect(row).toBeTruthy();
    expect(row.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(row);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('makes the story row available once the unit is done and navigates to /story/[unitId]', async () => {
    useAppStore.setState({
      progress: {
        'c-test.u1.l1': { lessonId: 'c-test.u1.l1', crowns: 1, completedAt: 1 },
        'c-test.u1.l2': { lessonId: 'c-test.u1.l2', crowns: 1, completedAt: 1 },
      },
    });
    await renderPath();
    const row = screen.getByRole('button', { name: 'Birim 1 hikâyesi, başlanabilir' });
    expect(screen.getByText('Hikâye: Kahvede buluşma')).toBeTruthy();
    await fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story/[unitId]', params: { unitId: 'c-test.u1' } });
  });

  it('marks the story row completed when its progress row exists', async () => {
    useAppStore.setState({
      progress: {
        'c-test.u1.l1': { lessonId: 'c-test.u1.l1', crowns: 1, completedAt: 1 },
        'c-test.u1.l2': { lessonId: 'c-test.u1.l2', crowns: 1, completedAt: 1 },
        'c-test.u1.story': { lessonId: 'c-test.u1.story', crowns: 1, completedAt: 1 },
      },
    });
    await renderPath();
    const row = screen.getByRole('button', { name: 'Birim 1 hikâyesi, tamamlandı' });
    await fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story/[unitId]', params: { unitId: 'c-test.u1' } });
  });

  it('renders no story row for a unit without a story', async () => {
    await renderPath();
    expect(screen.queryByRole('button', { name: 'Bölüm iki hikâyesi, kilitli' })).toBeNull();
    // unit 1 still has its row — exactly one story row on the path
    expect(screen.getAllByRole('button', { name: /hikâyesi/ })).toHaveLength(1);
  });
});
