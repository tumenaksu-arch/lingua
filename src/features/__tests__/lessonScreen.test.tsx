import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS } from '@/data';
import type { Course, Exercise } from '@/domain';
import { useAppStore } from '@/features/store';
import { aiStatus } from '@/features/conversation';
import { aiExplain } from '@/features/lesson/explainApi';
import { useSettingsStore } from '@/ui/settingsStore';

import LessonScreen from '@/app/lesson/[id]';

jest.mock('@/features/conversation', () => ({
  AiError: class AiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'AiError';
      this.code = code;
    }
  },
  aiStatus: jest.fn(),
}));

jest.mock('@/features/lesson/explainApi', () => ({ aiExplain: jest.fn() }));

const aiStatusMock = aiStatus as jest.Mock;
const aiExplainMock = aiExplain as jest.Mock;

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
        { id: 'l1', order: 1, vocabIds: [], exercises: [ex('e1', 'a', 'b'), ex('e2', 'x', 'y')] },
      ],
    },
  ],
};

const mockReplace = router.replace as jest.Mock;

let saveStats: jest.Mock;
let finishLesson: jest.Mock;

beforeEach(() => {
  jest.useRealTimers();
  saveStats = jest.fn(() => Promise.resolve());
  finishLesson = jest.fn(() => Promise.resolve({ xpEarned: 10, dailyGoalJustReached: false }));
  useAppStore.setState({
    course,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 0, heartsUpdatedAt: Date.now() },
    saveStats,
    finishLesson,
  });
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, hydrated: true });
  // AI kapalı varsayılanı: ExplainButton hiç görünmez, mevcut akışlar etkilenmez.
  aiStatusMock.mockClear();
  aiExplainMock.mockClear();
  aiStatusMock.mockResolvedValue({ enabled: false, limit: 30, remaining: null });
  mockReplace.mockClear();
});

async function renderLesson() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LessonScreen />
    </SafeAreaProvider>,
  );
}

/** Press "Kontrol et" and continue from the feedback sheet. */
async function checkAndContinue() {
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
}

/** Answer the currently visible exercise wrongly (its second option). */
async function answerCurrentWrong() {
  const wrong = screen
    .queryAllByRole('radio')
    .find((r) => r.props.accessibilityLabel === 'b' || r.props.accessibilityLabel === 'y');
  expect(wrong).toBeTruthy();
  await fireEvent.press(wrong!);
  await checkAndContinue();
}

/** Answer the currently visible exercise correctly (its first option). */
async function answerCurrentCorrect() {
  const right = screen
    .queryAllByRole('radio')
    .find((r) => r.props.accessibilityLabel === 'a' || r.props.accessibilityLabel === 'x');
  expect(right).toBeTruthy();
  await fireEvent.press(right!);
  await checkAndContinue();
}

describe('lesson screen with Rahat mod on', () => {
  it('starts even with 0 hearts, never loses hearts, and cannot fail', async () => {
    useSettingsStore.setState({ relaxedHearts: true });
    await renderLesson();

    // hearts 0 in the store but the lesson starts (no OutOfHearts) and the chip shows ∞
    expect(screen.queryByText('Kalplerin bitti 💔')).toBeNull();
    expect(screen.getByLabelText('Sınırsız kalp')).toBeTruthy();

    // more than 5 wrong answers: no heart is lost, the lesson is not failed
    for (let i = 0; i < 6; i++) await answerCurrentWrong();
    expect(saveStats).not.toHaveBeenCalled();
    expect(screen.queryByText('Kalplerin bitti 💔')).toBeNull();

    // finishing still saves progress (normal mode, not practice)
    await answerCurrentCorrect();
    await answerCurrentCorrect();
    expect(finishLesson).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ders tamamlandı! 🎉')).toBeTruthy();
  });
});

describe("ExplainButton (Cevabımı açıkla)", () => {
  beforeEach(() => {
    useSettingsStore.setState({ relaxedHearts: true });
  });

  it('yanlış cevapta düğme görünür; dokununca doğru gövdeyle istek atılır ve açıklama görünür', async () => {
    aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 10 });
    aiExplainMock.mockResolvedValue({ explanation: 'Cevabında küçük bir yazım hatası var.', tip: null, remaining: 9 });
    await renderLesson();

    const wrong = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === 'b');
    expect(wrong).toBeTruthy();
    await fireEvent.press(wrong!);
    await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
    const button = await screen.findByRole('button', { name: '🤖 Cevabımı açıkla' });
    await fireEvent.press(button);

    await screen.findByText('Cevabında küçük bir yazım hatası var.');
    expect(aiExplainMock).toHaveBeenCalledTimes(1);
    // doğru cevap metni ekrandaki "Doğru cevap:" ile aynı kaynaktan gelir
    expect(aiExplainMock).toHaveBeenCalledWith({
      courseId: 'c-test',
      exerciseType: 'select_translation',
      prompt: 'p-e1',
      userAnswer: 'b',
      correctAnswer: 'a',
    });
    // ikinci dokunuş yeni istek atmaz
    await fireEvent.press(screen.getByText('Cevabında küçük bir yazım hatası var.'));
    expect(aiExplainMock).toHaveBeenCalledTimes(1);
  });

  it('doğru cevapta düğme görünmez', async () => {
    aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 10 });
    await renderLesson();

    const right = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === 'a');
    expect(right).toBeTruthy();
    await fireEvent.press(right!);
    await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));

    expect(screen.getByText('Harika!')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '🤖 Cevabımı açıkla' })).toBeNull();
    expect(aiExplainMock).not.toHaveBeenCalled();
  });

  it('AI kapalıyken yanlış cevapta bile düğme görünmez', async () => {
    aiStatusMock.mockResolvedValue({ enabled: false, limit: 30, remaining: null });
    await renderLesson();

    await answerCurrentWrong();
    expect(screen.queryByRole('button', { name: '🤖 Cevabımı açıkla' })).toBeNull();
    expect(aiExplainMock).not.toHaveBeenCalled();
  });
});

describe('lesson screen with Rahat mod off', () => {
  it('shows OutOfHearts with 0 hearts and "Rahat modu aç ve devam et" enables Rahat mod', async () => {
    await renderLesson();

    expect(screen.getByText('Kalplerin bitti 💔')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Rahat modu aç ve devam et' }));

    expect(useSettingsStore.getState().relaxedHearts).toBe(true);
    // same lesson, normal mode: no 'practice' param, so the lesson counts as completed
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/lesson/[id]', params: { id: 'l1' } });
    // the relaxed key remounts the runner: the lesson now starts despite 0 hearts
    expect(screen.queryByText('Kalplerin bitti 💔')).toBeNull();
    expect(screen.getByLabelText('Sınırsız kalp')).toBeTruthy();
    expect(screen.getByText('p-e1')).toBeTruthy();
  });
});
