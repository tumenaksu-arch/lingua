/**
 * "Sınıf koduyla katıl" (madde 5, wave 2b): code auto-uppercase + alphabet
 * filtering, Turkish inline validation, and the anonymous join path — no
 * session at all still joins (joinAsStudent signs in anonymously) and lands
 * the student on the class course path.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { joinAsStudent, myClasses } from '@/data/remote/classes';
import { useAppStore } from '@/features/store';
import { useClassStore } from '@/features/classes/classStore';

import JoinClassScreen from '@/app/sinif-katil';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: (...args: unknown[]) => mockRouterBack(...args) },
}));

jest.mock('@/data/remote/classes', () => ({
  joinAsStudent: jest.fn(),
  myClasses: jest.fn(async () => []),
  leaveClass: jest.fn(async () => true),
  listAssignments: jest.fn(async () => []),
  classLeague: jest.fn(async () => []),
  isAnonymousSession: jest.fn(async () => false),
}));

jest.mock('@/features/classes/announcements', () => ({
  listAnnouncements: jest.fn(async () => []),
}));

const mocked = { joinAsStudent: jest.mocked(joinAsStudent), myClasses: jest.mocked(myClasses) };

const JOINED = { classId: 'c1', ad: '9-A İngilizce', courseId: 'tr-en' as const };
const CLASS_JOINED = { classId: 'c1', ad: '9-A İngilizce', courseId: 'tr-en' as const, takmaAd: 'YıldızKedi', joinedAt: '2026-10-26T10:00:00.000Z' };

beforeEach(() => {
  jest.clearAllMocks();
  useClassStore.setState({ myClasses: [], assignments: {}, announcements: {}, league: {}, loading: false, error: null });
});

async function renderJoin() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <JoinClassScreen />
    </SafeAreaProvider>,
  );
}

it('auto-uppercases the code and strips characters outside the join alphabet', async () => {
  await renderJoin();
  const code = screen.getByLabelText('Sınıf kodu');
  await fireEvent.changeText(code, 'ab1oı-3');
  expect(code).toHaveProp('value', 'AB3');
  await fireEvent.changeText(code, 'xyz234');
  expect(code).toHaveProp('value', 'XYZ234');
});

it('shows the KVKK info text and the nickname hint before joining', async () => {
  await renderJoin();
  expect(screen.getByText(/Öğretmenin bu takma adı ve öğrenme özetini/)).toBeTruthy();
  expect(screen.getByText('Gerçek adını yazmak zorunda değilsin.')).toBeTruthy();
});

it('validates both fields inline and never calls join', async () => {
  await renderJoin();
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıfa katıl' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Sınıf kodu 6 karakterdir/);
  expect(mocked.joinAsStudent).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText('Sınıf kodu'), 'ABC234');
  await fireEvent.changeText(screen.getByLabelText('Takma ad'), 'ab');
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıfa katıl' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Takma ad 3–20 karakter olmalı/);
  expect(mocked.joinAsStudent).not.toHaveBeenCalled();
});

it('joins with the normalized code and goes back on success', async () => {
  const join = jest.fn(async () => CLASS_JOINED);
  useClassStore.setState({ join });
  await renderJoin();
  await fireEvent.changeText(screen.getByLabelText('Sınıf kodu'), 'abc234');
  await fireEvent.changeText(screen.getByLabelText('Takma ad'), 'YıldızKedi');
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıfa katıl' }));
  await waitFor(() => expect(mockRouterBack).toHaveBeenCalled());
  expect(join).toHaveBeenCalledWith('ABC234', 'YıldızKedi');
});

it('shows the join RPC error inline instead of navigating', async () => {
  useClassStore.setState({
    join: jest.fn(async () => {
      throw new Error('Bilinmeyen sınıf kodu.');
    }),
  });
  await renderJoin();
  await fireEvent.changeText(screen.getByLabelText('Sınıf kodu'), 'ABC234');
  await fireEvent.changeText(screen.getByLabelText('Takma ad'), 'YıldızKedi');
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıfa katıl' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Bilinmeyen sınıf kodu/);
  expect(mockRouterBack).not.toHaveBeenCalled();
});

describe('classStore.join (anonymous join path)', () => {
  const realJoin = useClassStore.getState().join;

  beforeEach(() => {
    useAppStore.setState({
      welcomed: false,
      onboarded: false,
      continueAsGuest: jest.fn(async () => {}),
      completeOnboarding: jest.fn(async () => {}),
      selectCourse: jest.fn(async () => {}),
    });
    useClassStore.setState({ join: realJoin });
  });

  it('no-session join: anonymous sign-in happens in joinAsStudent, then onboarding completes with the class course and 20 XP goal', async () => {
    mocked.joinAsStudent.mockResolvedValueOnce(JOINED);
    const joined = await useClassStore.getState().join('ABC234', 'YıldızKedi');
    expect(mocked.joinAsStudent).toHaveBeenCalledWith('ABC234', 'YıldızKedi');
    const app = useAppStore.getState();
    expect(app.continueAsGuest).toHaveBeenCalledTimes(1); // let in from the welcome screen
    expect(app.completeOnboarding).toHaveBeenCalledWith('tr-en', 20);
    expect(app.selectCourse).not.toHaveBeenCalled();
    expect(joined).toMatchObject({ classId: 'c1', ad: '9-A İngilizce', takmaAd: 'YıldızKedi' });
    expect(mocked.myClasses).toHaveBeenCalled(); // store refreshed after the join
  });

  it('already-onboarded member just switches course', async () => {
    useAppStore.setState({ welcomed: true, onboarded: true });
    mocked.joinAsStudent.mockResolvedValueOnce(JOINED);
    await useClassStore.getState().join('ABC234', 'Kedi');
    const app = useAppStore.getState();
    expect(app.continueAsGuest).not.toHaveBeenCalled();
    expect(app.completeOnboarding).not.toHaveBeenCalled();
    expect(app.selectCourse).toHaveBeenCalledWith('tr-en');
  });

  it('rethrows the Turkish join error without touching the app store', async () => {
    useAppStore.setState({
      continueAsGuest: jest.fn(async () => {}),
      completeOnboarding: jest.fn(async () => {}),
      selectCourse: jest.fn(async () => {}),
    });
    mocked.joinAsStudent.mockRejectedValueOnce(new Error('Bu takma ad sınıfta kullanılıyor.'));
    await expect(useClassStore.getState().join('ABC234', 'Kedi')).rejects.toThrow('Bu takma ad sınıfta kullanılıyor.');
    expect(useAppStore.getState().continueAsGuest).not.toHaveBeenCalled();
  });
});
