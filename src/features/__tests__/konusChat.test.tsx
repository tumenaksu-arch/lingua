/**
 * AI conversation chat screen (roadmap item 6): opener seeds the thread, a
 * send renders the speakable assistant reply with a "Türkçesi" toggle, a
 * correction card renders under the user's bubble, 429 exhausts the day,
 * a 502 keeps the message retryable, done celebrates and awards XP once, the
 * request history is trimmed to 20 turns and the privacy note is present.
 * '@/data/remote/ai' and '@/speech' are mocked — no server contact.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { aiChat, aiScenarios, aiStatus, AiError } from '@/data/remote/ai';
import type { AiChatResponse } from '@/data/remote/ai';
import { useAppStore } from '@/features/store';
import { showAlert } from '@/ui/alert';

import ConversationScreen from '@/app/konus/[scenarioId]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const OPENERS = 'Hi! What would you like to order?';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ scenarioId: 's1' })),
}));

jest.mock('@/data/remote/ai', () => ({
  AiError: class AiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  aiStatus: jest.fn(),
  aiScenarios: jest.fn(),
  aiChat: jest.fn(),
}));

const mockSpeak = jest.fn();
const mockStt = { status: 'idle', transcript: '', error: null, start: jest.fn(), stop: jest.fn(), reset: jest.fn() };

jest.mock('@/speech', () => ({
  speak: (...args: unknown[]) => mockSpeak(...args),
  stopSpeaking: jest.fn(),
  isSpeaking: jest.fn(),
  useSpeechRecognition: () => mockStt,
  toLocale: (lang: string) => lang,
  LOCALE_BY_LANG: {},
}));

jest.mock('@/ui/alert', () => ({ showAlert: jest.fn() }));

const aiStatusMock = aiStatus as jest.Mock;
const aiScenariosMock = aiScenarios as jest.Mock;
const aiChatMock = aiChat as jest.Mock;
const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const showAlertMock = showAlert as jest.Mock;
let finishConversation: jest.Mock;

const SIGNED_IN_USER = { uid: 'u1', email: 'ayse@example.test', displayName: 'Ayşe' };

function reply(over: Partial<AiChatResponse> = {}): AiChatResponse {
  return { reply: 'A coffee, great choice!', replyTr: 'Bir kahve, harika seçim!', correction: null, done: false, remaining: 9, ...over };
}

async function renderChat() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ConversationScreen />
    </SafeAreaProvider>,
  );
  await screen.findByText(OPENERS);
}

/** Type a message and press send, flushing the mocked request. */
async function sendMessage(text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Mesajın'), text);
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Gönder' }));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSpeak.mockClear();
  mockStt.status = 'idle';
  mockStt.transcript = '';
  useLocalSearchParamsMock.mockReturnValue({ scenarioId: 's1' });
  aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 10 });
  aiScenariosMock.mockResolvedValue([
    {
      id: 's1',
      titleTr: 'Kafede sipariş',
      descriptionTr: 'Bir kafede sipariş veriyorsun.',
      level: 'A1',
      goalTr: 'Sipariş vermek',
      opener: OPENERS,
    },
  ]);
  aiChatMock.mockResolvedValue(reply());
  finishConversation = jest.fn(() => Promise.resolve({ xpEarned: 10 }));
  useAppStore.setState({ user: SIGNED_IN_USER, finishConversation });
});

describe('konus chat screen', () => {
  it('seeds the thread with the opener and speaks the assistant reply', async () => {
    await renderChat();
    // Header: scenario title + goal + remaining turns.
    expect(screen.getByText('Kafede sipariş')).toBeTruthy();
    expect(screen.getByText(/Hedef: Sipariş vermek/)).toBeTruthy();
    expect(screen.getByText(/Bugün kalan: 10\/30/)).toBeTruthy();
    // The opener bubble has a speaker button that speaks the course language.
    const speaker = screen.getByRole('button', { name: 'Dinle' });
    await fireEvent.press(speaker);
    expect(mockSpeak).toHaveBeenCalledWith(OPENERS, 'en', { rate: undefined });
  });

  it('sends the opener as history and renders the reply with a Türkçesi toggle', async () => {
    await renderChat();
    await sendMessage('I would like a coffee');
    expect(aiChatMock).toHaveBeenCalledWith({
      courseId: 'tr-en',
      scenarioId: 's1',
      history: [{ role: 'assistant', text: OPENERS }],
      message: 'I would like a coffee',
    });
    expect(screen.getByText('I would like a coffee')).toBeTruthy();
    expect(screen.getByText('A coffee, great choice!')).toBeTruthy();
    expect(screen.getByText(/Bugün kalan: 9\/30/)).toBeTruthy();
    // Reply is speakable too.
    const speakers = screen.getAllByRole('button', { name: 'Dinle' });
    expect(speakers.length).toBe(2);
    await fireEvent.press(speakers[1]!);
    expect(mockSpeak).toHaveBeenCalledWith('A coffee, great choice!', 'en', { rate: undefined });
    // The Türkçesi toggle reveals the server-provided translation.
    await fireEvent.press(screen.getByRole('button', { name: 'Türkçesi' }));
    expect(screen.getByText('Bir kahve, harika seçim!')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Türkçesini gizle' }));
    expect(screen.queryByText('Bir kahve, harika seçim!')).toBeNull();
  });

  it('shows the DÜZELTME card under the user bubble when the server corrects', async () => {
    aiChatMock.mockResolvedValue(
      reply({
        correction: {
          original: 'i would like a coffee',
          corrected: 'I would like a coffee.',
          explanationTr: 'Cümle başı I büyük harfle yazılır ve cümle noktayla biter.',
        },
      }),
    );
    await renderChat();
    await sendMessage('i would like a coffee');
    expect(screen.getByText('DÜZELTME')).toBeTruthy();
    // Original (struck through) and corrected versions both render.
    expect(screen.getAllByText('i would like a coffee').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('I would like a coffee.')).toBeTruthy();
    expect(screen.getByText('Cümle başı I büyük harfle yazılır ve cümle noktayla biter.')).toBeTruthy();
  });

  it('a 429 disables the input with the daily-limit message', async () => {
    aiChatMock.mockRejectedValue(new AiError('limit', 'Bugünlük konuşma hakkın doldu. Yarın tekrar gel!'));
    await renderChat();
    await sendMessage('hello');
    expect(await screen.findByText('Bugünlük konuşma hakkın doldu. Yarın tekrar gel!')).toBeTruthy();
    expect(screen.getByLabelText('Mesajın').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Gönder' }).props.accessibilityState.disabled).toBe(true);
  });

  it('a 502 offers a retry that keeps the failed message', async () => {
    aiChatMock.mockRejectedValueOnce(new AiError('upstream', 'Yapay zekâ servisi şu anda meşgul.'));
    await renderChat();
    await sendMessage('I would like a coffee');
    expect(await screen.findByText('Yapay zekâ servisi şu anda meşgul.')).toBeTruthy();
    expect(screen.queryByText('A coffee, great choice!')).toBeNull();
    // The failed message was not appended and stays retryable.
    expect(aiChatMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    });
    expect(aiChatMock).toHaveBeenCalledTimes(2);
    expect(aiChatMock.mock.calls[1]![0]).toMatchObject({ message: 'I would like a coffee' });
    expect(screen.getByText('A coffee, great choice!')).toBeTruthy();
    expect(screen.getAllByText('I would like a coffee')).toHaveLength(1);
  });

  it('done shows the celebration and awards XP exactly once', async () => {
    aiChatMock.mockResolvedValue(reply({ done: true, remaining: 0 }));
    await renderChat();
    await sendMessage('that is all, thank you');
    expect(await screen.findByText('Görev tamam!')).toBeTruthy();
    expect(screen.getByText(/\+10 XP/)).toBeTruthy();
    expect(finishConversation).toHaveBeenCalledTimes(1);
    expect(finishConversation).toHaveBeenCalledWith('s1');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Yeni senaryo' }));
    });
    expect(router.push).toHaveBeenCalledWith('/konus');
  });

  it('trims the request history to the last 20 turns', async () => {
    await renderChat();
    for (let i = 1; i <= 12; i++) {
      aiChatMock.mockResolvedValueOnce(reply({ reply: `reply ${i}` }));
      await sendMessage(`msg ${i}`);
      expect(screen.getByText(`reply ${i}`)).toBeTruthy();
    }
    const lastCall = aiChatMock.mock.calls[11]![0] as { history: { role: string; text: string }[] };
    expect(aiChatMock).toHaveBeenCalledTimes(12);
    // 23 turns so far (opener + 11 exchanges): only the last 20 are sent.
    expect(lastCall.history).toHaveLength(20);
    expect(lastCall.history[0]).toEqual({ role: 'user', text: 'msg 2' });
    expect(lastCall.history[19]).toEqual({ role: 'assistant', text: 'reply 11' });
  });

  it('shows the privacy note under the input', async () => {
    await renderChat();
    expect(
      screen.getByText('Konuşmaların kaydedilmez; yapay zekâ hata yapabilir. Kişisel bilgilerini (ad, adres, telefon) yazma.'),
    ).toBeTruthy();
  });

  it('hides the mic where speech recognition is unavailable', async () => {
    mockStt.status = 'unavailable';
    await renderChat();
    expect(screen.queryByRole('button', { name: 'Mikrofonla konuş' })).toBeNull();
  });

  it('inserts the recognised speech into the input', async () => {
    mockStt.status = 'done';
    mockStt.transcript = 'a cup of coffee please';
    await renderChat();
    expect(screen.getByLabelText('Mesajın').props.value).toBe('a cup of coffee please');
  });

  it('accepts a repeated utterance across two recognition sessions', async () => {
    mockStt.status = 'done';
    mockStt.transcript = 'a coffee';
    const view = await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    await screen.findByText(OPENERS);
    expect(screen.getByLabelText('Mesajın').props.value).toBe('a coffee');
    expect(mockStt.reset).toHaveBeenCalled();
    // Yeni oturum: start() transkripti sıfırladı, aynı söz öbeği yeniden tanındı.
    // Eski davranışta ref metni eşleştirir ve ikinci seferi sessizce düşürürdü.
    mockStt.status = 'listening';
    mockStt.transcript = '';
    await view.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    mockStt.status = 'done';
    mockStt.transcript = 'a coffee';
    await view.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByLabelText('Mesajın').props.value).toBe('a coffee a coffee');
  });

  it('shows the guest CTA without touching the network when signed out', async () => {
    useAppStore.setState({ user: null });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sınıf koduyla katıl' })).toBeTruthy();
    // Konuk: status/senaryo isteği atılmaz (asılma retry döngüsü yok).
    expect(aiStatusMock).not.toHaveBeenCalled();
    expect(aiScenariosMock).not.toHaveBeenCalled();
  });

  it('shows the coming-soon card when the server flag is off', async () => {
    aiStatusMock.mockResolvedValue({ enabled: false, limit: 30, remaining: null });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    expect(await screen.findByText('Konuşma pratiği yakında')).toBeTruthy();
    // Yapılandırılmamış sunucu hata/retry döngüsüne düşmez.
    expect(screen.queryByRole('button', { name: 'Tekrar dene' })).toBeNull();
  });

  it('alerts instead of promising XP when the save is rejected', async () => {
    finishConversation.mockRejectedValue(new Error('Store not booted'));
    aiChatMock.mockResolvedValue(reply({ done: true, remaining: 0 }));
    await renderChat();
    await sendMessage('that is all, thank you');
    expect(await screen.findByText('Görev tamam!')).toBeTruthy();
    // Vaat edilmemiş XP gösterilmez.
    expect(screen.queryByText(/\+10 XP/)).toBeNull();
    expect(screen.getByText('Senaryoyu başarıyla tamamladın.')).toBeTruthy();
    expect(showAlertMock).toHaveBeenCalledWith('Puan kaydedilemedi', expect.any(String));
  });
});
