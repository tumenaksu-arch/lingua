import { fireEvent, render, screen } from '@testing-library/react-native';

import { speak } from '@/speech';
import type {
  CompleteChatExercise,
  FillBlankExercise,
  ListenSelectExercise,
  MatchPairsExercise,
  ListenTypeExercise,
  PictureSelectExercise,
  ReadAnswerExercise,
  SelectTranslationExercise,
  TranslateBuildExercise,
} from '@/domain';
import { useSettingsStore } from '@/ui';

import { CompleteChat } from '../exercises/CompleteChat';
import { FillBlank } from '../exercises/FillBlank';
import { ListenSelect } from '../exercises/ListenSelect';
import { ListenType } from '../exercises/ListenType';
import { MatchPairs } from '../exercises/MatchPairs';
import { PictureSelect } from '../exercises/PictureSelect';
import { ReadAnswer } from '../exercises/ReadAnswer';
import { SelectTranslation } from '../exercises/SelectTranslation';
import { TranslateBuild } from '../exercises/TranslateBuild';

jest.mock('@/speech', () => ({
  speak: jest.fn(() => Promise.resolve()),
  stopSpeaking: jest.fn(() => Promise.resolve()),
  useSpeechRecognition: () => ({ status: 'unavailable', transcript: '', error: null, start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
}));

const common = { disabled: false, targetLang: 'en' as const };

beforeEach(() => {
  jest.mocked(speak).mockClear();
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, hydrated: false });
});

describe('ListenType', () => {
  const exercise: ListenTypeExercise = {
    id: 'lt1',
    type: 'listen_type',
    promptLang: 'tr',
    audioText: 'Hello, how are you today?',
    audioLang: 'en',
    answers: ['Hello, how are you today?'],
  };

  it('speaks the slow turtle button at the stored slowRate', async () => {
    useSettingsStore.setState({ slowRate: 0.4 });
    await render(<ListenType exercise={exercise} onAnswer={jest.fn()} {...common} />);
    jest.mocked(speak).mockClear();

    await fireEvent.press(screen.getByRole('button', { name: 'Yavaş dinle' }));

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith(exercise.audioText, 'en', { rate: 0.4 });
  });
});
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


describe('ListenSelect', () => {
  const exercise: ListenSelectExercise = {
    id: 'ls1',
    type: 'listen_select',
    promptLang: 'en',
    audioText: 'You are my friend',
    audioLang: 'en',
    options: ['You are my teacher', 'You are my friend', 'I am your friend'],
    correctIndex: 1,
  };

  it('speaks the slow turtle button at the stored slowRate', async () => {
    useSettingsStore.setState({ slowRate: 0.4 });
    await render(<ListenSelect exercise={exercise} onAnswer={jest.fn()} {...common} />);
    jest.mocked(speak).mockClear();

    await fireEvent.press(screen.getByRole('button', { name: 'Yavaş dinle' }));

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith(exercise.audioText, 'en', { rate: 0.4 });
  });

  it('reports the selected option once', async () => {
    const onAnswer = jest.fn();
    await render(<ListenSelect exercise={exercise} onAnswer={onAnswer} {...common} />);

    await press(/^You are my friend/);
    await press('Kontrol et', 'button');

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true, 'You are my friend');
    // locked after checking
    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('ignores taps while disabled', async () => {
    const onAnswer = jest.fn();
    await render(<ListenSelect exercise={exercise} onAnswer={onAnswer} {...common} disabled />);

    expect(screen.getByRole('button', { name: 'Kontrol et' })).toBeDisabled();
    await press(/^You are my friend/);
    await press('Kontrol et', 'button');
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe('PictureSelect', () => {
  const exercise: PictureSelectExercise = {
    id: 'ps1',
    type: 'picture_select',
    promptLang: 'tr',
    prompt: '"arkadaş" hangisi?',
    options: [
      { emoji: '1️⃣', label: 'one' },
      { emoji: '🧑‍🏫', label: 'teacher' },
      { emoji: '🤝', label: 'friend' },
    ],
    correctIndex: 2,
  };

  it('grades the picked card by its label', async () => {
    const onAnswer = jest.fn();
    await render(<PictureSelect exercise={exercise} onAnswer={onAnswer} {...common} />);

    await press(/^friend/);
    await press('Kontrol et', 'button');

    expect(onAnswer).toHaveBeenCalledWith(true, 'friend');
  });

  it('grades a wrong card and reveals the correct one', async () => {
    const onAnswer = jest.fn();
    await render(<PictureSelect exercise={exercise} onAnswer={onAnswer} {...common} />);

    await press(/^teacher/);
    await press('Kontrol et', 'button');

    expect(onAnswer).toHaveBeenCalledWith(false, 'teacher');
    expect(screen.getByRole('radio', { name: 'friend, doğru' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'teacher, yanlış' })).toBeTruthy();
  });

  it('ignores taps while disabled', async () => {
    const onAnswer = jest.fn();
    await render(<PictureSelect exercise={exercise} onAnswer={onAnswer} {...common} disabled />);

    await press(/^friend/);
    await press('Kontrol et', 'button');
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe('CompleteChat', () => {
  const exercise: CompleteChatExercise = {
    id: 'cc1',
    type: 'complete_chat',
    promptLang: 'en',
    lines: [{ speaker: 'a', text: 'Are you a student?' }],
    options: ['Yes, I am a student.', 'No, I am a teacher.', 'I am your friend.'],
    correctIndex: 0,
  };

  it('speaks a chat line when its bubble is tapped', async () => {
    await render(<CompleteChat exercise={exercise} onAnswer={jest.fn()} {...common} />);
    jest.mocked(speak).mockClear();

    await fireEvent.press(screen.getByRole('button', { name: 'Are you a student?, dinle' }));

    expect(speak).toHaveBeenCalledWith('Are you a student?', 'en');
  });

  it('grades the chosen reply and locks after checking', async () => {
    const onAnswer = jest.fn();
    await render(<CompleteChat exercise={exercise} onAnswer={onAnswer} {...common} />);

    await press(/^Yes, I am a student/);
    await press('Kontrol et', 'button');

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true, 'Yes, I am a student.');
    // locked after checking
    await press(/^No, I am a teacher/);
    await press('Kontrol et', 'button');
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('ignores taps while disabled', async () => {
    const onAnswer = jest.fn();
    await render(<CompleteChat exercise={exercise} onAnswer={onAnswer} {...common} disabled />);

    await press(/^Yes, I am a student/);
    await press('Kontrol et', 'button');
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe('ReadAnswer', () => {
  const exercise: ReadAnswerExercise = {
    id: 'ra1',
    type: 'read_answer',
    promptLang: 'en',
    passage: 'I am a student. You are my friend.',
    question: 'Metindeki kişiler kim?',
    options: ['Bir öğrenci ve bir arkadaş', 'Bir öğrenci ve bir öğretmen'],
    correctIndex: 0,
  };

  it('speaks the passage from the speaker button', async () => {
    await render(<ReadAnswer exercise={exercise} onAnswer={jest.fn()} {...common} />);
    jest.mocked(speak).mockClear();

    await fireEvent.press(screen.getByRole('button', { name: 'Dinle' }));

    expect(speak).toHaveBeenCalledWith(exercise.passage, 'en', { rate: undefined });
  });

  it('grades the chosen option', async () => {
    const onAnswer = jest.fn();
    await render(<ReadAnswer exercise={exercise} onAnswer={onAnswer} {...common} />);

    await press(/^Bir öğrenci ve bir öğretmen/);
    await press('Kontrol et', 'button');

    expect(onAnswer).toHaveBeenCalledWith(false, 'Bir öğrenci ve bir öğretmen');
    expect(screen.getByRole('radio', { name: 'Bir öğrenci ve bir arkadaş, doğru' })).toBeTruthy();
  });

  it('ignores taps while disabled', async () => {
    const onAnswer = jest.fn();
    await render(<ReadAnswer exercise={exercise} onAnswer={onAnswer} {...common} disabled />);

    await press(/^Bir öğrenci ve bir arkadaş/);
    await press('Kontrol et', 'button');
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
