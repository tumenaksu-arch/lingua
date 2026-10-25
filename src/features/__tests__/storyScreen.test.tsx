import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Story } from '@/content/stories';
import { getUnitStory } from '@/content/stories';
import { DEFAULT_STATS } from '@/data';
import { useAppStore } from '@/features/store';

import StoryScreen from '@/app/story/[unitId]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockStory: Story = {
  id: 'tr-en.u1.story',
  unitId: 'tr-en.u1',
  title: 'Kahvede tanışma',
  setting: 'Bir kafede iki yabancı sohbet ediyor.',
  characters: [
    { name: 'Anna', gender: 'f' },
    { name: 'Mark', gender: 'm' },
  ],
  lines: [
    { speaker: 'Anna', text: 'Hello!', tr: 'Merhaba!' },
    { speaker: 'Mark', text: 'How are you?', tr: 'Nasılsın?' },
  ],
  questions: [
    {
      prompt: 'Anna ne dedi?',
      options: ['Merhaba!', 'Hoşça kal!'],
      correctIndex: 0,
      explanation: 'Anna “Hello!” diyerek selam verdi.',
    },
    {
      prompt: 'Mark ne sordu?',
      options: ['Nasılsın?', 'Saat kaç?'],
      correctIndex: 0,
      explanation: 'Mark “How are you?” diye sordu.',
    },
  ],
};

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ unitId: 'tr-en.u1' })),
}));

jest.mock('@/content/stories', () => ({
  getUnitStory: jest.fn(() => mockStory),
}));

const mockBack = router.back as jest.Mock;
const getUnitStoryMock = getUnitStory as jest.Mock;
let finishStory: jest.Mock;

beforeEach(() => {
  finishStory = jest.fn(() => Promise.resolve({ xpEarned: 16 }));
  getUnitStoryMock.mockImplementation(() => mockStory);
  useAppStore.setState({
    progress: {},
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
    finishStory,
  });
  mockBack.mockClear();
});

async function renderStory() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <StoryScreen />
    </SafeAreaProvider>,
  );
}

/** Reveal all lines and move to the questions phase. */
async function readToQuestions() {
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' })); // reveal line 2
  expect(screen.getByText('How are you?')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Sorulara geç' }));
  expect(screen.getByText('Anna ne dedi?')).toBeTruthy();
}

/** Select the option with the given label, then press "Kontrol et". */
async function answer(label: string) {
  await fireEvent.press(screen.getByRole('radio', { name: label }));
  await fireEvent.press(screen.getByRole('button', { name: 'Kontrol et' }));
}

/** Continue from the feedback sheet to the next question / summary. */
async function continueFromSheet() {
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
}

describe('story screen', () => {
  it('reveals lines one by one and toggles the Turkish translation', async () => {
    await renderStory();

    expect(screen.getByText('HİKÂYE')).toBeTruthy();
    expect(screen.getByText('Kahvede tanışma')).toBeTruthy();
    expect(screen.getByText('Bir kafede iki yabancı sohbet ediyor.')).toBeTruthy();
    // only the first line is visible at start; the speaker name is shown in small caps
    expect(screen.getByText('Hello!')).toBeTruthy();
    expect(screen.getByText('ANNA')).toBeTruthy();
    expect(screen.queryByText('How are you?')).toBeNull();

    // translation toggle shows and hides the Turkish line
    await fireEvent.press(screen.getByRole('button', { name: 'Çeviri' }));
    expect(screen.getByText('Merhaba!')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Çeviriyi gizle' }));
    expect(screen.queryByText('Merhaba!')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
    expect(screen.getByText('How are you?')).toBeTruthy();
  });

  it('asks the questions, shows explanations, finishes via the store and navigates back', async () => {
    await renderStory();
    await readToQuestions();

    // question 1 — correct answer: sheet headline + explanation
    await answer('Merhaba!');
    expect(screen.getByText('Harika!')).toBeTruthy();
    expect(screen.getByText('Anna “Hello!” diyerek selam verdi.')).toBeTruthy();
    await continueFromSheet();

    // question 2 — wrong answer: sheet shows the correct solution + explanation
    await answer('Saat kaç?');
    expect(screen.getByText('Doğru cevap:')).toBeTruthy();
    // the correct option appears both on its card and as the sheet solution
    expect(screen.getAllByText('Nasılsın?').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Mark “How are you?” diye sordu.')).toBeTruthy();
    await continueFromSheet();

    // summary: 1/2 correct, XP from the store; "Bitir" goes back
    expect(await screen.findByText('Hikâye tamamlandı! 🎉')).toBeTruthy();
    expect(finishStory).toHaveBeenCalledTimes(1);
    expect(finishStory).toHaveBeenCalledWith('tr-en.u1.story', 1, 2);
    expect(screen.getByLabelText('Doğru: 1/2')).toBeTruthy();
    expect(screen.getByLabelText('XP: +16')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Bitir' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('counts a fully correct run', async () => {
    await renderStory();
    await readToQuestions();
    await answer('Merhaba!');
    await continueFromSheet();
    await answer('Nasılsın?');
    await continueFromSheet();

    expect(await screen.findByText('Hikâye tamamlandı! 🎉')).toBeTruthy();
    expect(finishStory).toHaveBeenCalledWith('tr-en.u1.story', 2, 2);
    expect(screen.getByLabelText('Doğru: 2/2')).toBeTruthy();
  });
});

describe('story screen finish robustness', () => {
  it('calls finishStory only once when Devam is double-pressed during a pending save', async () => {
    let resolveFinish!: (v: { xpEarned: number }) => void;
    finishStory.mockImplementation(() => new Promise((res) => { resolveFinish = res; }));
    await renderStory();
    await readToQuestions();
    await answer('Merhaba!');
    await continueFromSheet();
    await answer('Nasılsın?'); // last question answered, feedback sheet open

    const devam = screen.getByRole('button', { name: 'Devam' });
    const kontrol = screen.getByRole('button', { name: 'Kontrol et' });
    await fireEvent.press(devam); // starts the save; promise stays pending

    // non-interactive saving state: question controls are gone
    expect(screen.queryByRole('button', { name: 'Kontrol et' })).toBeNull();
    expect(screen.getByText('Sonuçlar kaydediliyor…')).toBeTruthy();
    expect(finishStory).toHaveBeenCalledTimes(1);

    // stale nodes pressed again while the save is pending must not re-trigger
    await fireEvent.press(devam);
    await fireEvent.press(kontrol);
    expect(finishStory).toHaveBeenCalledTimes(1);

    await act(async () => resolveFinish({ xpEarned: 16 }));
    expect(await screen.findByText('Hikâye tamamlandı! 🎉')).toBeTruthy();
    expect(finishStory).toHaveBeenCalledTimes(1);
  });

  it('finishes a story with zero questions straight from the last line', async () => {
    const noQuestions: Story = { ...mockStory, questions: [] };
    getUnitStoryMock.mockReturnValue(noQuestions);
    finishStory.mockResolvedValue({ xpEarned: 10 });
    await renderStory();

    // after the last line the button goes straight to finishing — no questions phase
    await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Bitir' }));
    expect(finishStory).toHaveBeenCalledTimes(1);
    expect(finishStory).toHaveBeenCalledWith('tr-en.u1.story', 0, 0);

    expect(await screen.findByText('Hikâye tamamlandı! 🎉')).toBeTruthy();
    expect(screen.getByLabelText('Doğru: 0/0')).toBeTruthy();
    expect(screen.getByLabelText('XP: +10')).toBeTruthy();
  });

  it('shows Kaydedilemedi with Tekrar dene / Ana sayfa when the save fails', async () => {
    finishStory
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ xpEarned: 16 });
    await renderStory();
    await readToQuestions();
    await answer('Merhaba!');
    await continueFromSheet();
    await answer('Nasılsın?');
    await continueFromSheet();

    // error state replaces the unreachable summary
    expect(await screen.findByText('Kaydedilemedi: offline')).toBeTruthy();
    expect(screen.queryByText('Hikâye tamamlandı! 🎉')).toBeNull();
    expect(finishStory).toHaveBeenCalledTimes(1);

    // retrying the save succeeds and reaches the summary
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Hikâye tamamlandı! 🎉')).toBeTruthy();
    expect(finishStory).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('XP: +16')).toBeTruthy();
  });

  it('navigates home from the error state via Ana sayfa', async () => {
    finishStory.mockRejectedValue(new Error('offline'));
    await renderStory();
    await readToQuestions();
    await answer('Merhaba!');
    await continueFromSheet();
    await answer('Nasılsın?');
    await continueFromSheet();

    await fireEvent.press(await screen.findByRole('button', { name: 'Ana sayfa' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
