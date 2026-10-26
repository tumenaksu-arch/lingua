/**
 * "Konuş" tab (roadmap item 6): guests get an explanation with sign-in
 * options, a disabled server shows a clean coming-soon card, and when enabled
 * the current course's scenario list renders with level chips and the
 * remaining daily turns. '@/data/remote/ai' is mocked — no server contact.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AuthUser } from '@/data';
import { aiScenarios, aiStatus } from '@/data/remote/ai';
import type { AiScenario } from '@/data/remote/ai';
import { useAppStore } from '@/features/store';

import KonusScreen from '@/app/(tabs)/konus';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
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

const routerPush = router.push as jest.Mock;
const aiStatusMock = aiStatus as jest.Mock;
const aiScenariosMock = aiScenarios as jest.Mock;

const SCENARIOS: AiScenario[] = [
  {
    id: 's1',
    titleTr: 'Kafede sipariş',
    descriptionTr: 'Bir kafede sipariş veriyorsun.',
    level: 'A1',
    goalTr: 'Sipariş vermek',
    opener: 'Hi! What would you like?',
  },
  {
    id: 's2',
    titleTr: 'Otelde resepsiyon',
    descriptionTr: 'Otelde oda ayırtıyorsun.',
    level: 'B1',
    goalTr: 'Oda ayırtmak',
    opener: 'Good evening! How can I help you?',
  },
];

const USER = { uid: 'u1', email: null, displayName: null } as AuthUser;

async function renderTab() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <KonusScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ user: null });
  aiStatusMock.mockResolvedValue({ enabled: true, limit: 30, remaining: 7 });
  aiScenariosMock.mockResolvedValue(SCENARIOS);
});

describe('konus tab', () => {
  it('guests see an explanation with sign-in and class-code options', async () => {
    await renderTab();
    expect(await screen.findByText(/rol yaparak konuşma pratiği yap/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));
    expect(routerPush).toHaveBeenCalledWith('/auth');
    await fireEvent.press(screen.getByRole('button', { name: 'Sınıf koduyla katıl' }));
    expect(routerPush).toHaveBeenCalledWith('/sinif-katil');
    // No AI request is made for guests.
    expect(aiStatusMock).not.toHaveBeenCalled();
  });

  it('shows a clean coming-soon card when the feature is disabled', async () => {
    aiStatusMock.mockResolvedValue({ enabled: false, limit: 30, remaining: null });
    useAppStore.setState({ user: USER });
    await renderTab();
    expect(await screen.findByText('Konuşma pratiği yakında')).toBeTruthy();
    // A disabled feature never surfaces errors or a stale list.
    expect(screen.queryByText(/Bir sorun oluştu/)).toBeNull();
    expect(screen.queryByText('Kafede sipariş')).toBeNull();
    expect(aiScenariosMock).toHaveBeenCalled();
  });

  it('lists the course scenarios with level chips, goals and remaining turns', async () => {
    useAppStore.setState({ user: USER });
    await renderTab();
    expect(await screen.findByText('Kafede sipariş')).toBeTruthy();
    expect(screen.getByText('Otelde resepsiyon')).toBeTruthy();
    // Level chips render in Space Mono.
    expect(screen.getByText('A1')).toBeTruthy();
    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.getByText('Bir kafede sipariş veriyorsun.')).toBeTruthy();
    expect(screen.getByText('Hedef: Oda ayırtmak')).toBeTruthy();
    expect(screen.getByText('Bugün kalan: 7/30')).toBeTruthy();
  });

  it('opens the chat when a scenario card is pressed', async () => {
    useAppStore.setState({ user: USER });
    await renderTab();
    await fireEvent.press(await screen.findByRole('button', { name: 'Kafede sipariş, seviye A1' }));
    expect(routerPush).toHaveBeenCalledWith({ pathname: '/konus/[scenarioId]', params: { scenarioId: 's1' } });
  });
});
