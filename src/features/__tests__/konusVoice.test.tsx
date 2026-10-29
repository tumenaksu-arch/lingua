/**
 * Konuşma pratiğinde sesli mod (Video Call benzeri): transcript 'done' olunca
 * bir kez otomatik gönderilir (boşsa gönderilmez), yanıt gelince tts hedef
 * dilde reply okur, Türkçe çeviri başlangıçta katlıdır, seslendirme sırasında
 * düğme "Durdur" olur (tts.stop), mikrofon izni reddinde nazik mesaj + yazılı
 * moda dönüş sunulur, mod tercihi settingsStore'da hatırlanır ve konuşma
 * bitince özet kartı ile yeniden başlatma vardır.
 * '@/data/remote/ai' ve '@/speech' are mocked — no server contact.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { aiChat, aiScenarios, aiStatus } from '@/data/remote/ai';
import type { AiChatResponse } from '@/data/remote/ai';
import { useAppStore } from '@/features/store';
import { useSettingsStore } from '@/ui/settingsStore';

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
const mockStopSpeaking = jest.fn();
// reset, gerçek kancadaki gibi oturumu sıfırlar: aynı söz öbeği yeni bir
// oturumda tekrar gönderilebilsin diye transkript ve durum temizlenir.
const mockStt: {
  status: string;
  transcript: string;
  error: string | null;
  start: jest.Mock;
  stop: jest.Mock;
  reset: jest.Mock;
} = {
  status: 'idle',
  transcript: '',
  error: null,
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(() => {
    mockStt.status = 'idle';
    mockStt.transcript = '';
  }),
};

jest.mock('@/speech', () => ({
  speak: (...args: unknown[]) => mockSpeak(...args),
  stopSpeaking: (...args: unknown[]) => mockStopSpeaking(...args),
  isSpeaking: jest.fn(),
  useSpeechRecognition: () => mockStt,
  toLocale: (lang: string) => lang,
  LOCALE_BY_LANG: {},
}));

jest.mock('@/ui/alert', () => ({ showAlert: jest.fn() }));

const aiStatusMock = aiStatus as jest.Mock;
const aiScenariosMock = aiScenarios as jest.Mock;
const aiChatMock = aiChat as jest.Mock;

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

/** Sesli modda konuşulacak transkripti hazırla ('done' durumu). */
function speakAndReceive(transcript: string) {
  mockStt.status = 'done';
  mockStt.transcript = transcript;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStt.status = 'idle';
  mockStt.transcript = '';
  mockStt.error = null;
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
  useAppStore.setState({ user: SIGNED_IN_USER, finishConversation: jest.fn(() => Promise.resolve({ xpEarned: 10 })) });
  useSettingsStore.setState({ konusMode: 'sesli' });
});

describe('konus sesli mod', () => {
  it('transcript "done" olunca bir kez otomatik gönderilir', async () => {
    speakAndReceive('a coffee please');
    await renderChat();
    expect(await screen.findByText('a coffee please')).toBeTruthy();
    expect(aiChatMock).toHaveBeenCalledTimes(1);
    expect(aiChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'a coffee please', history: [{ role: 'assistant', text: OPENERS }] }),
    );
    // Oturum sıfırlanır; aynı transkript ikinci kez gönderilmez.
    expect(mockStt.reset).toHaveBeenCalled();
    expect(mockStt.status).toBe('idle');
    expect(aiChatMock).toHaveBeenCalledTimes(1);
  });

  it('boş transcript gönderilmez', async () => {
    mockStt.status = 'done';
    mockStt.transcript = '   ';
    await renderChat();
    expect(aiChatMock).not.toHaveBeenCalled();
  });

  it('yanıt gelince tts hedef dildeki reply okur; Türkçesi başlangıçta gizlidir', async () => {
    speakAndReceive('a coffee please');
    await renderChat();
    expect(await screen.findByText('A coffee, great choice!')).toBeTruthy();
    expect(mockSpeak).toHaveBeenCalledWith(
      'A coffee, great choice!',
      'en',
      expect.objectContaining({ onDone: expect.any(Function), onError: expect.any(Function) }),
    );
    // Türkçe çeviri başlangıçta katlı: göster düğmesiyle açılır.
    expect(screen.queryByText('Bir kahve, harika seçim!')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Türkçesini göster' }));
    expect(screen.getByText('Bir kahve, harika seçim!')).toBeTruthy();
  });

  it('seslendirme sırasında düğme Durdur olur ve tts durdurur', async () => {
    speakAndReceive('a coffee please');
    await renderChat();
    await screen.findByText('A coffee, great choice!');
    await fireEvent.press(screen.getByRole('button', { name: 'Durdur' }));
    expect(mockStopSpeaking).toHaveBeenCalled();
    // Durdurunca mikrofon düğmesine dönülür; mikrofon kendiliğinden açılmaz.
    expect(screen.getByRole('button', { name: 'Konuşmak için dokun' })).toBeTruthy();
    expect(mockStt.start).not.toHaveBeenCalled();
  });

  it('mikrofon düğmesi dinlemeyi başlatır, dinlerken durdurur', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    await screen.findByText(OPENERS);
    await fireEvent.press(screen.getByRole('button', { name: 'Konuşmak için dokun' }));
    expect(mockStt.start).toHaveBeenCalledTimes(1);
    mockStt.status = 'listening';
    await view.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ConversationScreen />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Dinlemeyi durdur' }));
    expect(mockStt.stop).toHaveBeenCalledTimes(1);
  });

  it('mikrofon izni reddinde nazik mesaj ve yazılı moda dönüş önerisi', async () => {
    mockStt.status = 'unavailable';
    mockStt.error = 'permission-denied';
    await renderChat();
    expect(await screen.findByText(/Mikrofona erişilemiyor/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Yazılı moda geç' }));
    expect(useSettingsStore.getState().konusMode).toBe('yazili');
    // Yazılı moda dönülünce klavye girişi geri gelir.
    expect(screen.getByLabelText('Mesajın')).toBeTruthy();
  });

  it('mod tercihi hatırlanır', async () => {
    useSettingsStore.setState({ konusMode: 'yazili', hydrated: false });
    await renderChat();
    // Varsayılan yazılı mod: klavye girişi görünür.
    expect(screen.getByLabelText('Mesajın')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sesli mod' }));
    expect(useSettingsStore.getState().konusMode).toBe('sesli');
    // Tercih ayrı anahtarda kalıcıdır; hydrate geri yükler.
    expect(await AsyncStorage.getItem('konus_mode_v1')).toBe('sesli');
    useSettingsStore.setState({ konusMode: 'yazili', hydrated: false });
    await act(async () => {
      await useSettingsStore.getState().hydrate();
    });
    expect(useSettingsStore.getState().konusMode).toBe('sesli');
  });

  it('karakter kartı senaryoya göre persona gösterir', async () => {
    await renderChat();
    // "Kafede sipariş" senaryosunun barista personası.
    expect(screen.getByText('Lily')).toBeTruthy();
    expect(screen.getByText('☕')).toBeTruthy();
  });

  it('konuşma bitince özet kartı: mesaj/düzeltme sayısı ve yeniden başlat', async () => {
    aiChatMock.mockResolvedValue(
      reply({
        done: true,
        remaining: 0,
        correction: {
          original: 'that is all',
          corrected: 'That is all.',
          explanationTr: 'Cümle başı büyük harfle yazılır.',
        },
      }),
    );
    speakAndReceive('that is all');
    await renderChat();
    expect(await screen.findByText('Görev tamam!')).toBeTruthy();
    expect(screen.getByText('1 mesaj konuştun, 1 düzeltme aldın.')).toBeTruthy();
    // Yazılı moddaki "Yeni senaryo" kartı yerine yeniden başlatma vardır.
    expect(screen.queryByRole('button', { name: 'Yeni senaryo' })).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Konuşmayı yeniden başlat' }));
    });
    expect(screen.queryByText('Görev tamam!')).toBeNull();
    expect(screen.getByText(OPENERS)).toBeTruthy();
    // Yeniden başlatma eski mesajı yeniden göndermez.
    expect(aiChatMock).toHaveBeenCalledTimes(1);
  });

  it('sesli modda düzeltmeler başlangıçta katlıdır', async () => {
    aiChatMock.mockResolvedValue(
      reply({
        correction: {
          original: 'a coffee',
          corrected: 'A coffee, please.',
          explanationTr: 'Cümle noktayla biter.',
        },
      }),
    );
    speakAndReceive('a coffee');
    await renderChat();
    expect(await screen.findByText('a coffee')).toBeTruthy();
    expect(screen.queryByText('DÜZELTME')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Düzeltmeyi göster' }));
    expect(screen.getByText('DÜZELTME')).toBeTruthy();
    expect(screen.getByText('A coffee, please.')).toBeTruthy();
  });
});
