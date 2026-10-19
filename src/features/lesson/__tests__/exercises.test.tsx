import { fireEvent, render, screen } from '@testing-library/react-native';

import type { FillBlankExercise, MatchPairsExercise, SelectTranslationExercise, TranslateBuildExercise } from '@/domain';

import { FillBlank } from '../exercises/FillBlank';
import { MatchPairs } from '../exercises/MatchPairs';
import { SelectTranslation } from '../exercises/SelectTranslation';
import { TranslateBuild } from '../exercises/TranslateBuild';

jest.mock('@/speech', () => ({
  speak: jest.fn(() => Promise.resolve()),
  stopSpeaking: jest.fn(() => Promise.resolve()),
  useSpeechRecognition: () => ({ status: 'unavailable', transcript: '', error: null, start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
}));

const common = { disabled: false, targetLang: 'en' as const };
const press = (name: string | RegExp, role: 'button' | 'radio' = 'radio') => fireEvent.press(screen.getByRole(role, { name }));

describe('SelectTranslation', () => {
  const exercise: SelectTranslationExercise = {
    id: 'st1',
    type: 'select_translation',
    promptLang: 'tr',
    prompt: 'Merhaba',
    options: ['Goodbye', 'Hello', 'Please'],
    correctIndex: 1,
  };

  it('check stays disabled until an option is selected, then reports a correct answer once', async () => {
    const onAnswer = jest.fn();
    await render(<SelectTranslation exercise={exercise} onAnswer={onAnswer} {...common} />);
    const check = screen.getByRole('button', { name: 'Kontrol et' });
    expect(check).toBeDisabled();

    await press(/^Hello/);
    expect(screen.getByRole('button', { name: 'Kontrol et' })).toBeEnabled();
    await press('Kontrol et', 'button');

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true, 'Hello');
    // locked after checking: a second press must not re-submit
    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('reports a wrong answer and reveals the correct option', async () => {
    const onAnswer = jest.fn();
    await render(<SelectTranslation exercise={exercise} onAnswer={onAnswer} {...common} />);
    await press(/^Goodbye/);
    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledWith(false, 'Goodbye');
    expect(screen.getByRole('radio', { name: 'Hello, doğru' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Goodbye, yanlış' })).toBeTruthy();
  });
});

describe('FillBlank', () => {
  const exercise: FillBlankExercise = {
    id: 'fb1',
    type: 'fill_blank',
    promptLang: 'en',
    sentence: 'I ___ coffee.',
    options: ['likes', 'like', 'liking'],
    correctIndex: 1,
  };

  it('shows the chosen word in the sentence and grades it', async () => {
    const onAnswer = jest.fn();
    await render(<FillBlank exercise={exercise} onAnswer={onAnswer} {...common} />);
    await press(/^like\b/);
    expect(screen.getByText('I [like] coffee.')).toBeTruthy();
    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledWith(true, 'like');
  });

  it('grades a wrong choice', async () => {
    const onAnswer = jest.fn();
    await render(<FillBlank exercise={exercise} onAnswer={onAnswer} {...common} />);
    await press(/^likes/);
    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledWith(false, 'likes');
  });
});

describe('TranslateBuild', () => {
  const exercise: TranslateBuildExercise = {
    id: 'tb1',
    type: 'translate_build',
    promptLang: 'tr',
    prompt: 'Ben bir öğrenciyim',
    bank: ['student', 'am', 'a', 'I', 'teacher'],
    answers: ['I am a student'],
  };

  it('tapping bank chips builds the answer in order and grades it correct', async () => {
    const onAnswer = jest.fn();
    await render(<TranslateBuild exercise={exercise} onAnswer={onAnswer} {...common} />);
    expect(screen.getByRole('button', { name: 'Kontrol et' })).toBeDisabled();

    for (const w of ['I', 'am', 'a', 'student']) await press(w, 'button');
    expect(screen.getByLabelText('Cevabın: I am a student')).toBeTruthy();
    // the picked chip leaves an empty, inert slot in the bank
    expect(screen.getByRole('button', { name: 'student, kullanıldı' })).toBeDisabled();

    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledWith(true, 'I am a student');
  });

  it('tapping a chip in the answer row removes it; a wrong sentence is graded false', async () => {
    const onAnswer = jest.fn();
    await render(<TranslateBuild exercise={exercise} onAnswer={onAnswer} {...common} />);
    await press('I', 'button');
    await press('teacher', 'button');
    expect(screen.getByLabelText('Cevabın: I teacher')).toBeTruthy();

    // the answer row renders before the bank, so the first enabled "I" button is the picked chip
    await fireEvent.press(screen.getAllByRole('button', { name: 'I' })[0]!);
    expect(screen.getByLabelText('Cevabın: teacher')).toBeTruthy();

    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledWith(false, 'teacher');
  });
});

describe('MatchPairs', () => {
  const exercise: MatchPairsExercise = {
    id: 'mp1',
    type: 'match_pairs',
    promptLang: 'tr',
    pairs: [
      { left: 'kedi', right: 'cat' },
      { left: 'köpek', right: 'dog' },
      { left: 'kuş', right: 'bird' },
    ],
  };

  it('completing every pair submits a correct answer exactly once, even after a miss', async () => {
    const onAnswer = jest.fn();
    await render(<MatchPairs exercise={exercise} onAnswer={onAnswer} {...common} />);

    // a wrong pairing flashes red and does not finish the exercise
    await press(/^kedi/);
    await press(/^dog/);
    expect(screen.getByRole('radio', { name: 'kedi, yanlış' })).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();

    for (const [l, r] of [
      ['kedi', 'cat'],
      ['köpek', 'dog'],
      ['kuş', 'bird'],
    ] as const) {
      await press(new RegExp(`^${l}`));
      await press(new RegExp(`^${r}`));
    }
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getAllByRole('radio', { name: /, doğru$/ })).toHaveLength(6);
  });
});
