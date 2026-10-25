/**
 * Skip-test screen (roadmap item 4): runs the unit's 12 exam questions with
 * the shared exercise components, never touches hearts, reports 10/12 as a
 * pass and 9/12 as a fail, and offers "Tekrar dene" after a fail.
 */
import { fireEvent, render, screen, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS } from '@/data';
import type { Course, Exercise } from '@/domain';
import { useAppStore } from '@/features/store';
import { showAlert } from '@/ui/alert';

import SkipScreen from '@/app/skip/[unitId]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ unitId: 'u2' })),
}));

jest.mock('@/ui/alert', () => ({ showAlert: jest.fn() }));

const mockBack = router.back as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

const ex = (id: string): Exercise => ({
  id,
  type: 'select_translation',
  promptLang: 'tr',
  prompt: `p-${id}`,
  options: ['a', 'b'],
  correctIndex: 0,
});

/** One unit, 3 lessons × 4 exercises = 12 eligible exam questions. */
const course: Course = {
  id: 'c-test',
  fromLang: 'tr',
  toLang: 'en',
  title: 'Test kursu',
  vocab: [],
  units: [
    {
      id: 'u2',
      order: 2,
      title: 'İkinci ünite',
      description: 'test',
      lessons: [1, 2, 3].map((n) => ({
        id: `u2.l${n}`,
        order: n,
        vocabIds: [],
        exercises: [1, 2, 3, 4].map((i) => ex(`u2.l${n}.q${i}`)),
      })),
    },
  ],
};

let finishSkipTest: jest.Mock;
let skipAttempts: jest.Mock;
let saveStats: jest.Mock;

beforeEach(() => {
  jest.useRealTimers();
  // Mirrors the store contract: >= 80% passes and pays 20 XP; a quit always fails.
  finishSkipTest = jest.fn((_unitId: string, correct: number, total: number, opts?: { quit?: boolean }) =>
    Promise.resolve({
      passed: opts?.quit === true ? false : correct / total >= 0.8,
      xpEarned: opts?.quit === true || correct / total < 0.8 ? 0 : 20,
    }),
  );
  skipAttempts = jest.fn(() => Promise.resolve(0));
  saveStats = jest.fn(() => Promise.resolve());
  mockBack.mockClear();
  mockShowAlert.mockClear();
  useAppStore.setState({
    course,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
    finishSkipTest,
    skipAttempts,
    saveStats,
  });
});

async function renderExam() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SkipScreen />
    </SafeAreaProvider>,
  );
  // waits out the attempt-count loading state
  await screen.findByText('SINAV');
}

/** Answer the visible question: 'a' is correct, 'b' is wrong. */
async function answerCurrent(option: 'a' | 'b') {
  const radio = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === option);
  expect(radio).toBeTruthy();
  await fireEvent.press(radio!);
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
}

test('passes with 10/12, never consumes hearts, shows the skip reward', async () => {
  await renderExam();

  // 2 wrong answers (they re-queue to the end) + 12 correct = 10/12 score
  for (let i = 0; i < 14; i++) await answerCurrent(i < 2 ? 'b' : 'a');

  expect(finishSkipTest).toHaveBeenCalledTimes(1);
  expect(finishSkipTest).toHaveBeenCalledWith('u2', 10, 12);

  await screen.findByText('Ünite atlandı! 🎉');
  expect(screen.getByLabelText('XP: +20')).toBeTruthy();
  expect(screen.getByLabelText('Doğruluk: %83')).toBeTruthy();
  // no hearts were consumed: the exam never writes stats
  expect(saveStats).not.toHaveBeenCalled();
  expect(useAppStore.getState().stats.hearts).toBe(5);
});

test('quitting after 10 correct records an explicit quit (never a pass) and leaves', async () => {
  await renderExam();

  for (let i = 0; i < 10; i++) await answerCurrent('a');

  await fireEvent.press(screen.getByRole('button', { name: 'Sınavı kapat' }));
  expect(mockShowAlert).toHaveBeenCalledTimes(1);
  const [title, , buttons] = mockShowAlert.mock.calls[0]!;
  expect(title).toBe('Sınavı bırak?');
  const quitBtn = (buttons as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Bırak')!;
  await act(async () => {
    quitBtn.onPress!();
  });

  // 10/12 correct would be a pass on a finished attempt — a quit must not be:
  // the screen passes the explicit quit flag and never saves a passing result.
  expect(finishSkipTest).toHaveBeenCalledTimes(1);
  expect(finishSkipTest).toHaveBeenCalledWith('u2', 10, 12, { quit: true });
  expect(mockBack).toHaveBeenCalled();
  expect(saveStats).not.toHaveBeenCalled();
  expect(useAppStore.getState().stats.hearts).toBe(5);
});

test('fails with 9/12, logs the attempt, offers retry and home', async () => {
  await renderExam();

  for (let i = 0; i < 15; i++) await answerCurrent(i < 3 ? 'b' : 'a');

  expect(finishSkipTest).toHaveBeenCalledTimes(1);
  expect(finishSkipTest).toHaveBeenCalledWith('u2', 9, 12);

  await screen.findByText('Geçmek için en az %80 gerekiyor');
  expect(saveStats).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Ana sayfa' })).toBeTruthy();

  // a new attempt restarts the exam (attempt 1 = a fresh shuffle)
  await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByText('SINAV');
  expect(screen.getByText('Soru 1 / 12')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Kontrol et' })).toBeTruthy();
});
