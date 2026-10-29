/**
 * Review tab (job 1A): the two Practice Hub cards above the flashcard deck —
 * passive with an encouraging caption at N=0, navigating to /practice/[mode]
 * when N > 0.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/features/store';

import ReviewScreen from '@/app/(tabs)/review';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

const mockPush = router.push as jest.Mock;

let mistakeCount: jest.Mock;
let weakWordCards: jest.Mock;

beforeEach(() => {
  mockPush.mockClear();
  mistakeCount = jest.fn(() => Promise.resolve(0));
  weakWordCards = jest.fn(() => Promise.resolve([]));
  useAppStore.setState({
    loadDueCards: jest.fn(() => Promise.resolve([])),
    startReviewSession: jest.fn(() => Promise.resolve()),
    reviewCard: jest.fn(() => Promise.resolve()),
    mistakeCount,
    weakWordCards,
  });
});

async function renderReview() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ReviewScreen />
    </SafeAreaProvider>,
  );
}

describe('practice hub cards at N=0', () => {
  it('show the passive caption and do not navigate', async () => {
    await renderReview();
    expect(screen.getByText('Hatalarım (0)')).toBeTruthy();
    expect(screen.getByText('Henüz hata yok — harika!')).toBeTruthy();
    expect(screen.getByText('Zayıf kelimeler (0)')).toBeTruthy();
    expect(screen.getByText('Henüz zayıf kelime yok — harika!')).toBeTruthy();

    fireEvent.press(screen.getByText('Hatalarım (0)'));
    fireEvent.press(screen.getByText('Zayıf kelimeler (0)'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('practice hub cards at N>0', () => {
  it('navigate to /practice/mistakes and /practice/words', async () => {
    mistakeCount.mockResolvedValue(3);
    weakWordCards.mockResolvedValue([{ vocabId: 'a' }, { vocabId: 'b' }]);
    await renderReview();

    expect(await screen.findByText('Hatalarım (3)')).toBeTruthy();
    expect(screen.getByText('Zayıf kelimeler (2)')).toBeTruthy();

    fireEvent.press(screen.getByText('Hatalarım (3)'));
    expect(mockPush).toHaveBeenCalledWith('/practice/mistakes');

    fireEvent.press(screen.getByText('Zayıf kelimeler (2)'));
    expect(mockPush).toHaveBeenCalledWith('/practice/words');
  });
});
