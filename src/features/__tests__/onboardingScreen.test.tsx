/**
 * Onboarding (roadmap item 1B): after the course and daily goal steps the user
 * gets two options — "Sıfırdan başla" goes home as before, "Seviyemi bul"
 * completes the onboarding (course + goal are stored) and opens /placement.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/features/store';

import OnboardingScreen from '@/app/onboarding';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const mockReplace = router.replace as jest.Mock;

let completeOnboarding: jest.Mock;

beforeEach(() => {
  completeOnboarding = jest.fn(() => Promise.resolve());
  mockReplace.mockClear();
  useAppStore.setState({ completeOnboarding });
});

async function reachGoalStep() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OnboardingScreen />
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getAllByRole('radio')[0]!);
  await fireEvent.press(screen.getByRole('button', { name: 'Devam' }));
}

test('both start options are shown on the goal step', async () => {
  await reachGoalStep();
  expect(screen.getByRole('button', { name: 'Sıfırdan başla' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Seviyemi bul' })).toBeTruthy();
});

test('"Sıfırdan başla" completes the onboarding and goes home', async () => {
  await reachGoalStep();
  await fireEvent.press(screen.getByRole('button', { name: 'Sıfırdan başla' }));
  expect(completeOnboarding).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/');
});

test('"Seviyemi bul" completes the onboarding and opens the placement exam', async () => {
  await reachGoalStep();
  await fireEvent.press(screen.getByRole('button', { name: 'Seviyemi bul' }));
  expect(completeOnboarding).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/placement');
  expect(mockReplace).not.toHaveBeenCalledWith('/');
});
