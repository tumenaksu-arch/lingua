/**
 * "Cevabımı açıkla" düğmesi (Duolingo "Explain My Answer"): yapay zekâ kapalıysa
 * veya oturum yoksa düğme hiç görünmez; açıkken dokunulunca /v1/explain'e istek
 * atılır, gelen Türkçe açıklama aynı geri bildirim alanında gösterilir, 429'da
 * nazik limit mesajı, başarıda düğme yerini açıklamaya bırakır (ikinci istek yok).
 * '@/features/conversation' ve '../explainApi' mock'lanır — sunucuya çıkış yok.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { aiStatus, AiError } from '@/features/conversation';
import { aiExplain } from '../explainApi';
import { ExplainButton } from '../ExplainButton';

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

jest.mock('../explainApi', () => ({ aiExplain: jest.fn() }));

const aiStatusMock = aiStatus as jest.Mock;
const aiExplainMock = aiExplain as jest.Mock;

const PROPS = {
  courseId: 'tr-en',
  exerciseType: 'select_translation',
  prompt: "'Elma' nasıl söylenir?",
  userAnswer: 'aple',
  correctAnswer: 'apple',
};

const EXPLANATION = "'Aple' yazımında küçük bir hata var: 'apple' çift p ile yazılır.";

async function renderButton() {
  await render(<ExplainButton {...PROPS} />);
}

describe('ExplainButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiExplainMock.mockResolvedValue({ explanation: EXPLANATION, tip: null, remaining: 9 });
  });

  it('yapay zekâ kapalıysa düğme hiç görünmez', async () => {
    aiStatusMock.mockResolvedValue({ enabled: false, limit: 30, remaining: null });
    await renderButton();
    await waitFor(() => expect(aiStatusMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: '🤖 Cevabımı açıkla' })).toBeNull();
    expect(aiExplainMock).not.toHaveBeenCalled();
  });

  it('oturum yoksa (auth hatası) düğme hiç görünmez', async () => {
    aiStatusMock.mockRejectedValue(new AiError('auth', 'Oturumun geçersiz. Lütfen tekrar giriş yap.'));
    await renderButton();
    await waitFor(() => expect(aiStatusMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: '🤖 Cevabımı açıkla' })).toBeNull();
  });

  it('açıkken dokunulunca doğru gövdeyle istek atar ve açıklama görünür', async () => {
    aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 10 });
    await renderButton();
    await screen.findByRole('button', { name: '🤖 Cevabımı açıkla' });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '🤖 Cevabımı açıkla' }));
    });

    await screen.findByText(EXPLANATION);
    expect(aiExplainMock).toHaveBeenCalledTimes(1);
    expect(aiExplainMock).toHaveBeenCalledWith(PROPS);
    // düğme yerini açıklamaya bıraktı
    expect(screen.queryByRole('button', { name: '🤖 Cevabımı açıkla' })).toBeNull();
  });

  it('429 limit hatasında nazik Türkçe limit mesajı gösterilir', async () => {
    aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 0 });
    aiExplainMock.mockRejectedValue(new AiError('limit', 'Bugünlük yapay zekâ mesaj limitin doldu, yarın tekrar dene.'));
    await renderButton();
    await screen.findByRole('button', { name: '🤖 Cevabımı açıkla' });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '🤖 Cevabımı açıkla' }));
    });

    await screen.findByText('Bugünlük yapay zekâ mesaj limitin doldu, yarın tekrar dene.');
    expect(aiExplainMock).toHaveBeenCalledTimes(1);
  });

  it('başarıdan sonra ikinci dokunuş yeni istek atmaz', async () => {
    aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 10 });
    await renderButton();
    await screen.findByRole('button', { name: '🤖 Cevabımı açıkla' });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '🤖 Cevabımı açıkla' }));
    });
    await screen.findByText(EXPLANATION);
    expect(aiExplainMock).toHaveBeenCalledTimes(1);

    // Açıklama alanına yeniden dokunulsa bile istek sayısı değişmez.
    await act(async () => {
      fireEvent.press(screen.getByText(EXPLANATION));
    });
    expect(aiExplainMock).toHaveBeenCalledTimes(1);
  });

  it('hata sonrası "Tekrar dene" yeni istek atar', async () => {
    aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 10 });
    aiExplainMock
      .mockRejectedValueOnce(new AiError('network', 'Bağlantı yok. İnternetini kontrol et.'))
      .mockResolvedValueOnce({ explanation: EXPLANATION, tip: null, remaining: 8 });
    await renderButton();
    await screen.findByRole('button', { name: '🤖 Cevabımı açıkla' });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '🤖 Cevabımı açıkla' }));
    });
    await screen.findByText('Bağlantı yok. İnternetini kontrol et.');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    });
    await screen.findByText(EXPLANATION);
    expect(aiExplainMock).toHaveBeenCalledTimes(2);
  });
});
