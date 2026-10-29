/**
 * Placement screen (roadmap item 1B, "Seviyemi bul"): an adaptive climb —
 * unit 1 with 3/3 and unit 2 with 2/3 pass, unit 3 with 1/3 ends the exam;
 * only the passed units are handed to completeUnitsByPlacement (no XP path),
 * the result names the unit to start from, and "Bitir" finishes early with
 * whatever was passed so far (nothing passed → the store is never touched).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_STATS } from '@/data';
import type { Course, Exercise } from '@/domain';
import { useAppStore } from '@/features/store';

import PlacementScreen from '@/app/placement';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const mockReplace = router.replace as jest.Mock;

const ex = (id: string): Exercise => ({
  id,
  type: 'select_translation',
  promptLang: 'tr',
  prompt: `p-${id}`,
  options: ['a', 'b'],
  correctIndex: 0,
});

/** Three units, one lesson of 3 eligible questions each. */
const course: Course = {
  id: 'c-test',
  fromLang: 'tr',
  toLang: 'en',
  title: 'Test kursu',
  vocab: [],
  units: ['u1', 'u2', 'u3'].map((uid, i) => ({
    id: uid,
    order: i + 1,
    title: `Ünite ${i + 1}`,
    description: 'test',
    lessons: [{ id: `${uid}.l1`, order: 1, vocabIds: [], exercises: [1, 2, 3].map((n) => ex(`${uid}.l1.q${n}`)) }],
  })),
};

let completeUnitsByPlacement: jest.Mock;

beforeEach(() => {
  jest.useRealTimers();
  completeUnitsByPlacement = jest.fn(() => Promise.resolve());
  mockReplace.mockClear();
  useAppStore.setState({
    course,
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
    completeUnitsByPlacement,
  });
});

async function renderExam() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PlacementScreen />
    </SafeAreaProvider>,
  );
  await screen.findByText('SEVİYE TESPİTİ');
}

/** Answer the visible question: 'a' is correct, 'b' is wrong (wrong re-queues to the end). */
async function answerCurrent(option: 'a' | 'b') {
  const radio = screen.queryAllByRole('radio').find((r) => r.props.accessibilityLabel === option);
  expect(radio).toBeTruthy();
  await fireEvent.press(radio!);
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
}

test('3/3 then 2/3 pass, 1/3 ends the exam; only passed units are saved and the result names unit 3', async () => {
  await renderExam();

  // unit 1: 3/3
  for (let i = 0; i < 3; i++) await answerCurrent('a');
  // unit 2: 2/3 — one wrong (retried correct) counts as a mistake
  await answerCurrent('b');
  for (let i = 0; i < 3; i++) await answerCurrent('a');
  // unit 3: 1/3 — two wrongs fail the unit and end the exam
  await answerCurrent('b');
  await answerCurrent('a');
  await answerCurrent('b');
  await answerCurrent('a');
  await answerCurrent('a');

  expect(completeUnitsByPlacement).toHaveBeenCalledTimes(1);
  expect(completeUnitsByPlacement).toHaveBeenCalledWith(['u1', 'u2']);

  await screen.findByText("Ünite 3'den başlıyorsun");
  expect(screen.getByText('✓ Ünite 1')).toBeTruthy();
  expect(screen.getByText('✓ Ünite 2')).toBeTruthy();
  expect(screen.getByText('Seviye tespiti XP kazandırmaz.')).toBeTruthy();
  expect(useAppStore.getState().progress).toEqual({}); // saving runs through the mocked action

  await fireEvent.press(screen.getByRole('button', { name: 'Başla' }));
  expect(mockReplace).toHaveBeenCalledWith('/');
});

test('"Bitir" after one passed unit saves only that unit', async () => {
  await renderExam();
  for (let i = 0; i < 3; i++) await answerCurrent('a');

  await fireEvent.press(screen.getByRole('button', { name: 'Sınavı bitir' }));

  expect(completeUnitsByPlacement).toHaveBeenCalledTimes(1);
  expect(completeUnitsByPlacement).toHaveBeenCalledWith(['u1']);
  await screen.findByText("Ünite 2'den başlıyorsun");
});

test('"Bitir" before any unit passed touches neither the store nor progress', async () => {
  await renderExam();
  await fireEvent.press(screen.getByRole('button', { name: 'Sınavı bitir' }));

  expect(completeUnitsByPlacement).not.toHaveBeenCalled();
  await screen.findByText("Ünite 1'den başlıyorsun");
  expect(screen.getByText('Hiç ünite geçilemedi; ilk üniteden başlayacaksın.')).toBeTruthy();
  expect(useAppStore.getState().progress).toEqual({});
});
