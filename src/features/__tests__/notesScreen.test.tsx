import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { speak } from '@/speech';

import UnitNotesScreen from '@/app/notes/[unitId]';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 740 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({ unitId: 'tr-en.u1' })),
}));

jest.mock('@/speech', () => ({
  speak: jest.fn(() => Promise.resolve()),
  stopSpeaking: jest.fn(() => Promise.resolve()),
  isSpeaking: jest.fn(() => Promise.resolve(false)),
}));

const mockParams = useLocalSearchParams as jest.Mock;
const mockSpeak = speak as jest.Mock;
const mockBack = router.back as jest.Mock;

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UnitNotesScreen />
    </SafeAreaProvider>,
  );
}

describe('notes screen', () => {
  beforeEach(() => {
    mockParams.mockReturnValue({ unitId: 'tr-en.u1' });
    mockSpeak.mockClear();
    mockBack.mockClear();
  });

  it('renders the eyebrow, title, a section heading and examples', async () => {
    await renderScreen();

    expect(screen.getByText('DİLBİLGİSİ NOTU')).toBeTruthy();
    expect(screen.getByText("Selamlaşma ve 'to be'")).toBeTruthy();
    expect(screen.getByText("'to be': am, is, are")).toBeTruthy();
    expect(screen.getByText('Ben bir öğrenciyim.')).toBeTruthy();
    // target sentence shown next to its Turkish translation
    expect(screen.getByText('I am a student.')).toBeTruthy();
  });

  it('speaks an example in the course target language when its speaker is pressed', async () => {
    await renderScreen();

    const speakers = screen.getAllByRole('button', { name: 'Dinle' });
    expect(speakers.length).toBeGreaterThan(0);
    await fireEvent.press(speakers[0]);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('I am a student.', 'en', { rate: undefined });
  });

  it('shows a friendly empty state and Kapat for an unknown unit', async () => {
    mockParams.mockReturnValue({ unitId: 'tr-en.u999' });
    await renderScreen();

    expect(screen.getByText('Bu ünite için not henüz yok.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
