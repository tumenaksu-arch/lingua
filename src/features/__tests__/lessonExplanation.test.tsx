import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getExplanation, genericHint } from '@/content/explanations';
import { DEFAULT_STATS } from '@/data';
import type { Course, Exercise } from '@/domain';
import { useAppStore } from '@/features/store';
import { useSettingsStore } from '@/ui/settingsStore';

import LessonScreen from '@/app/lesson/[id]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'l1' })),
}));

const ex = (id: string, correct: string, wrong: string): Exercise => ({
  id,
  type: 'select_translation',
  promptLang: 'tr',
  prompt: `p-${id}`,
  options: [correct, wrong],
  correctIndex: 0,
});

// First exercise has a dedicated explanation; the second does not.
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
        { id: 'l1', order: 1, vocabIds: [], exercises: [ex('tr-en.u1.l1.e1', 'hello', 'goodbye'), ex('unknown.e1', 'a', 'b')] },
      ],
    },
  ],
};

beforeEach(() => {
  jest.useRealTimers();
  useAppStore.setState({
    course,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
    saveStats: jest.fn(() => Promise.resolve()),
    finishLesson: jest.fn(() => Promise.resolve({ xpEarned: 10, dailyGoalJustReached: false })),
  });
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: true, hydrated: true });
});

async function renderLesson() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LessonScreen />
    </SafeAreaProvider>,
  );
}

async function answerWrong(label: string) {
  const wrong = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === label);
  expect(wrong).toBeTruthy();
  await fireEvent.press(wrong!);
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
}

it('shows "NEDEN?" with the exercise explanation after a wrong answer', async () => {
  await renderLesson();
  await answerWrong('goodbye');

  expect(screen.getByText('NEDEN?')).toBeTruthy();
  const explanation = getExplanation('tr-en.u1.l1.e1')!;
  expect(screen.getByText(explanation)).toBeTruthy();
});

it('falls back to the generic per-type hint when no explanation exists', async () => {
  await renderLesson();
  await answerWrong('goodbye');
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));

  await answerWrong('b');
  expect(screen.getByText('NEDEN?')).toBeTruthy();
  expect(screen.getByText(genericHint('select_translation'))).toBeTruthy();
  // the dedicated explanation from the previous exercise is gone
  expect(screen.queryByText(getExplanation('tr-en.u1.l1.e1')!)).toBeNull();
});

it('shows no explanation after a correct answer', async () => {
  await renderLesson();
  const right = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === 'hello');
  expect(right).toBeTruthy();
  await fireEvent.press(right!);
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));

  expect(screen.queryByText('NEDEN?')).toBeNull();
});
