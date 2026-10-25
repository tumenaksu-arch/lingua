/**
 * Home tab daily-quests card (roadmap item 3a): renders today's 3 quests with
 * progress and claims a reward through the store.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { DEFAULT_STATS } from '@/data';
import type { QuestStatus } from '@/features/quests';
import { useAppStore } from '@/features/store';

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

function quest(partial: Partial<QuestStatus> & Pick<QuestStatus, 'id' | 'title' | 'target'>): QuestStatus {
  return { current: 0, done: false, claimed: false, ...partial };
}

const TODAY_QUESTS: QuestStatus[] = [
  quest({ id: 'xp_goal', title: 'Günlük hedefin kadar XP kazan', target: 20, current: 12 }),
  quest({ id: 'lessons_2', title: '2 ders bitir', target: 2, current: 2, done: true }),
  quest({ id: 'story_1', title: 'Bir hikâye tamamla', target: 1, current: 1, done: true, claimed: true }),
];

let claimMock: jest.Mock;

beforeEach(() => {
  claimMock = jest.fn().mockResolvedValue({ xpEarned: 10 });
  useAppStore.setState({
    course: trEn,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
    quests: TODAY_QUESTS,
    claimQuest: claimMock as unknown as (questId: string) => Promise<{ xpEarned: number }>,
  });
});

async function renderHome() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );
}

it('renders the 3 daily quests above the learning path with progress', async () => {
  await renderHome();
  expect(screen.getByText('GÜNLÜK GÖREVLER')).toBeTruthy();
  for (const q of TODAY_QUESTS) {
    expect(screen.getByText(q.title)).toBeTruthy();
    expect(screen.getByText(`${q.current}/${q.target}`)).toBeTruthy();
  }
  // claimed quest shows the mono "taken" label; not-yet-done one shows no reward control
  expect(screen.getByText('✓ Alındı')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Günlük hedefin kadar XP kazan ödülünü al' })).toBeNull();
});

it('pressing "… ödülünü al" calls claimQuest for that quest', async () => {
  await renderHome();
  const btn = screen.getByRole('button', { name: '2 ders bitir ödülünü al' });
  await fireEvent.press(btn);
  expect(claimMock).toHaveBeenCalledTimes(1);
  expect(claimMock).toHaveBeenCalledWith('lessons_2');
});

it('renders nothing when there are no quests', async () => {
  useAppStore.setState({ quests: [] });
  await renderHome();
  expect(screen.queryByText('GÜNLÜK GÖREVLER')).toBeNull();
});
