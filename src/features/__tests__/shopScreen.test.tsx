/**
 * Shop screen (job 3A): prices and passive states render correctly, the
 * streak-repair card only appears for a recently lost streak, and buying an
 * item deducts the balance through the real store action.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { MAX_STREAK_FREEZES } from '@/domain';
import { useAppStore } from '@/features/store';

import ShopScreen from '@/app/shop';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

let db: FakeDb;

async function renderShop() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ShopScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  db = new FakeDb();
  setDbForTesting(db);
  useAppStore.setState({ ready: false, onboarded: false, welcomed: false, db: null, progress: {}, dueCount: 0, achievements: [], newAchievements: [], reminderHour: null, quests: [], questDate: null, claimingQuestIds: [] });
  await useAppStore.getState().boot();
});

afterAll(() => setDbForTesting(null));

test('shows the title, the gem balance and every price', async () => {
  await renderShop();
  expect(screen.getByText('Mağaza')).toBeTruthy();
  expect(screen.getByText('50')).toBeTruthy(); // welcome gift balance
  expect(screen.getByText('200 💎')).toBeTruthy(); // seri dondurma
  expect(screen.getByText('100 💎')).toBeTruthy(); // çift XP
  // Canlar dolu olduğunda "Canları doldur" kartı pasif görünür; fiyat yok.
  expect(screen.getByText('Canların dolu')).toBeTruthy();
});

test('an unaffordable item shows how many more gems are needed and disables the button', async () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  useAppStore.setState({
    stats: {
      ...useAppStore.getState().stats,
      gems: 120,
      hearts: 3, // can dolumu kartını aktif yap
      lostStreak: { value: 6, lostOn: d.toISOString().slice(0, 10) },
    },
  });
  await renderShop();
  // Çift XP (100) hâlâ alınabilir; 350 ve 400'lük kartlar pahalı.
  expect(screen.getByText('230 elmas daha gerekli')).toBeTruthy(); // 350 - 120
  expect(screen.getByText('280 elmas daha gerekli')).toBeTruthy(); // 400 - 120
  const refillBtn = screen.getByRole('button', { name: '350 💎' });
  expect(refillBtn.props.accessibilityState.disabled).toBe(true);
});

test('a full freeze slot renders the passive "Dolu" state', async () => {
  useAppStore.setState({
    stats: { ...useAppStore.getState().stats, streakFreezes: MAX_STREAK_FREEZES },
  });
  await renderShop();
  expect(screen.getByText('Dolu')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '200 💎' })).toBeNull();
});

test('full hearts disable the refill card', async () => {
  await renderShop();
  expect(screen.getByText('Canların dolu')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '350 💎' })).toBeNull();
});

test('streak repair card is hidden without a recently lost streak', async () => {
  await renderShop();
  expect(screen.queryByText('400 💎')).toBeNull();
  expect(screen.queryByText('Serini onar')).toBeNull();
});

test('streak repair card appears for a streak lost within 2 days', async () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  useAppStore.setState({
    stats: { ...useAppStore.getState().stats, lostStreak: { value: 9, lostOn: d.toISOString().slice(0, 10) } },
  });
  await renderShop();
  expect(screen.getByText('Serini onar')).toBeTruthy();
  expect(screen.getByText('400 💎')).toBeTruthy();
});

test('buying an item deducts the balance and shows a success notice', async () => {
  useAppStore.setState({ stats: { ...useAppStore.getState().stats, gems: 500 } });
  await renderShop();
  await fireEvent.press(screen.getByRole('button', { name: '200 💎' }));
  expect(useAppStore.getState().stats.gems).toBe(300);
  expect(useAppStore.getState().stats.streakFreezes).toBe(1);
  expect(await screen.findByText(/satın alındı/)).toBeTruthy();
});

test('the close button leaves the modal', async () => {
  await renderShop();
  fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));
  expect(router.back).toHaveBeenCalled();
});
