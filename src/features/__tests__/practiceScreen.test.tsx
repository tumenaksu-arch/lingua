/**
 * Practice Hub session screen (job 1A): mistakes replays stored exercises
 * through ExerciseView and reports outcomes to finishPractice; words builds a
 * selectable quiz from the weakest SRS cards and reviews each answered card.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { useAppStore } from '@/features/store';

import PracticeScreen from '@/app/practice/[mode]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const trEn = courses[0]!;
const firstLesson = trEn.units[0]!.lessons[0]!;

const mockParams = useLocalSearchParams as jest.Mock;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ mode: 'mistakes' })),
}));

let mistakeEntries: jest.Mock;
let weakWordCards: jest.Mock;
let reviewCard: jest.Mock;
let finishPractice: jest.Mock;

beforeEach(() => {
  mistakeEntries = jest.fn(() => Promise.resolve([]));
  weakWordCards = jest.fn(() => Promise.resolve([]));
  reviewCard = jest.fn(() => Promise.resolve());
  finishPractice = jest.fn(() => Promise.resolve({ xpEarned: 10 }));
  useAppStore.setState({
    course: trEn,
    mistakeEntries,
    weakWordCards,
    reviewCard,
    finishPractice,
  });
});

async function renderPractice(mode: string) {
  mockParams.mockReturnValue({ mode });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PracticeScreen />
    </SafeAreaProvider>,
  );
}

describe('mistakes mode', () => {
  it('replays a stored exercise and reports the outcome on finish', async () => {
    const target = firstLesson.exercises[0]!;
    mistakeEntries.mockResolvedValue([{ exerciseId: target.id, wrongCount: 3, correctStreak: 0, lastWrongAt: 1 }]);
    await renderPractice('mistakes');

    // the stored exercise renders through ExerciseView
    expect(await screen.findByText(promptText(target))).toBeTruthy();

    // answer it wrong, continue → session ends after the retry loop answers it right
    await answerCurrent(false);
    await answerCurrent(true);

    expect(finishPractice).toHaveBeenCalledTimes(1);
    const [mode, correct, total, wrongIds, correctIds] = finishPractice.mock.calls[0]!;
    expect(mode).toBe('mistakes');
    expect(total).toBe(1);
    // wrong once (even with a later retry) keeps it in mistakes; a clean answer on a
    // FUTURE attempt counts toward the 2-in-a-row clear — never within the same session
    expect(wrongIds).toEqual([target.id]);
    expect(correctIds).toEqual([]);
    expect(correct).toBe(0); // lesson semantics: wrong at least once → not counted correct
    expect(await screen.findByText('Pratik tamamlandı! 🎉')).toBeTruthy();
    expect(router.back).toBeDefined();
  });

  it('shows the empty state when there is nothing to practice', async () => {
    await renderPractice('mistakes');
    expect(await screen.findByText('Henüz hata yok — harika!')).toBeTruthy();
    expect(finishPractice).not.toHaveBeenCalled();
  });
});

describe('words mode', () => {
  it('builds a term→translation quiz and reviews the SRS card per answer', async () => {
    const v0 = trEn.vocab[0]!;
    const v1 = trEn.vocab[1]!;
    weakWordCards.mockResolvedValue([
      { vocabId: v0.id, ease: 1.3, intervalDays: 1, reps: 0, dueAt: 0 },
      { vocabId: v1.id, ease: 1.4, intervalDays: 1, reps: 0, dueAt: 0 },
    ]);
    await renderPractice('words');

    // weakest word's term is the prompt
    expect(await screen.findByText(v0.term)).toBeTruthy();

    // pick the right translation → Kontrol et → Devam
    const right = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === v0.translation);
    expect(right).toBeTruthy();
    await fireEvent.press(right!);
    await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));

    expect(reviewCard).toHaveBeenCalledTimes(1);
    const [card, correct] = reviewCard.mock.calls[0]!;
    expect(card.vocabId).toBe(v0.id);
    expect(correct).toBe(true);
  });

  it('shows the empty state without weak words', async () => {
    await renderPractice('words');
    expect(await screen.findByText('Henüz zayıf kelime yok — harika!')).toBeTruthy();
  });
});

function promptText(e: (typeof firstLesson.exercises)[number]): string {
  return e.type === 'select_translation' || e.type === 'translate_build' ? e.prompt
    : e.type === 'fill_blank' ? e.sentence
    : e.type === 'speak' ? e.sentence
    : e.type === 'listen_type' ? e.audioText
    : e.pairs[0]!.left;
}

/** Answer the currently visible exercise: true = the correct option, false = a wrong one. */
async function answerCurrent(correct: boolean) {
  const radios = screen.queryAllByRole('radio');
  expect(radios.length).toBeGreaterThan(0);
  const target = firstLesson.exercises[0]!;
  const label = correct
    ? target.type === 'select_translation' || target.type === 'fill_blank'
      ? target.options[target.correctIndex]
      : undefined
    : target.type === 'select_translation' || target.type === 'fill_blank'
      ? target.options.find((_, i) => i !== target.correctIndex)
      : undefined;
  const pick = label ? radios.find((r) => r.props.accessibilityLabel === label) : radios[0];
  await fireEvent.press(pick!);
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
}
