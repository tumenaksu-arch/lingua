/**
 * Home class card (madde 5, wave 2b): shown ABOVE the daily-quests card for
 * class members — open (not-done) assignments with the Turkish due label,
 * "gecikti" in the danger color once the deadline passed, the latest
 * announcement with relative time, and a "Sınıfa git" shortcut. Done
 * assignments are not listed.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { DEFAULT_STATS } from '@/data';
import { useAppStore } from '@/features/store';
import { dueLabel, localDateIso, relativeTime } from '@/features/classes/classView';
import { useClassStore } from '@/features/classes/classStore';
import { upperTr } from '@/ui';

import LearnScreen from '@/app/(tabs)/index';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
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

const trEn = courses.find((c) => c.id === 'tr-en')!;
const unit1 = trEn.units[0]!;
const unit2 = trEn.units[1]!;

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateIso(d);
}

const CLASS = { classId: 'c1', ad: '9-A İngilizce', courseId: 'tr-en' as const, takmaAd: 'YıldızKedi', joinedAt: '2026-10-20T10:00:00.000Z' };

// unit1 fully completed (done, hidden), unit2 open with 0 of its lessons done.
const progress = Object.fromEntries(unit1.lessons.map((l) => [l.id, { lessonId: l.id, completedAt: 1, crowns: 1 }]));

beforeEach(() => {
  jest.clearAllMocks();
  mockRouterPush.mockClear();
  useAppStore.setState({
    course: trEn,
    progress,
    stats: { ...DEFAULT_STATS, hearts: 5, heartsUpdatedAt: Date.now() },
    quests: [],
  });
  useClassStore.setState({
    myClasses: [CLASS],
    assignments: {
      c1: [
        // unit1 fully done → 'bitti', hidden from the card.
        { id: 'a1', classId: 'c1', unitId: unit1.id, sonTarih: isoDaysFromToday(2), createdAt: '2026-10-20T08:00:00.000Z' },
        // overdue, not done → 'gecikti'.
        { id: 'a2', classId: 'c1', unitId: unit2.id, sonTarih: isoDaysFromToday(-1), createdAt: '2026-10-21T08:00:00.000Z' },
        // open, not done → due label.
        { id: 'a3', classId: 'c1', unitId: unit2.id, sonTarih: isoDaysFromToday(2), createdAt: '2026-10-22T08:00:00.000Z' },
      ],
    },
    announcements: {
      c1: [{ id: 'n1', metin: 'Cuma günü sınav var. Kitapçık sayfası 12.', createdAt: new Date(Date.now() - 5 * 60_000).toISOString() }],
    },
    league: {},
    loading: false,
    error: null,
    joinNote: null,
    load: jest.fn(async () => {}) as unknown as () => Promise<void>,
  });
});

async function renderHome() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LearnScreen />
    </SafeAreaProvider>,
  );
}

it('shows the class card above the quests card: caption, open assignment with due label, overdue in danger, done hidden', async () => {
  await renderHome();

  expect(screen.getByText(upperTr(`Sınıf · ${CLASS.ad}`))).toBeTruthy();
  // The done unit-1 assignment is not listed; the two open unit-2 rows are.
  expect(screen.queryByLabelText(new RegExp(`Ödev: ${unit1.title}`))).toBeNull();
  expect(screen.getAllByLabelText(new RegExp(`Ödev: ${unit2.title}`))).toHaveLength(2);
  expect(screen.getByText(dueLabel(isoDaysFromToday(2), new Date()))).toBeTruthy();
  expect(screen.getByText('gecikti')).toBeTruthy();
});

it('shows the latest announcement (2 lines) with relative time', async () => {
  await renderHome();
  expect(screen.getByText(/Cuma günü sınav var/)).toBeTruthy();
  const ann = useClassStore.getState().announcements.c1![0]!;
  expect(screen.getByText(relativeTime(ann.createdAt, Date.now()))).toBeTruthy();
});

it('"Sınıfa git" navigates to the class screen', async () => {
  await renderHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Sınıfa git' }));
  expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/sinif/[classId]', params: { classId: 'c1' } });
});

it('renders no card for non-members', async () => {
  useClassStore.setState({ myClasses: [], error: null });
  await renderHome();
  expect(screen.queryByText(upperTr(`Sınıf · ${CLASS.ad}`))).toBeNull();
  // Positive invariant: the rest of the home screen still renders, so this
  // test fails if the whole screen (not just the card) stops working.
  expect(screen.getByLabelText(/Kurs: .*\. Kurs değiştir/)).toBeTruthy();
});

it('shows the store error on the card instead of a fake empty state', async () => {
  useClassStore.setState({ myClasses: [], error: 'Oturumun geçersiz. Lütfen tekrar giriş yap.' });
  await renderHome();
  expect(screen.getByText('Oturumun geçersiz. Lütfen tekrar giriş yap.')).toBeTruthy();
});

it('shows the join confirmation note on the card', async () => {
  useClassStore.setState({ joinNote: 'Sınıfa katıldın: 9-A İngilizce' });
  await renderHome();
  expect(screen.getByText('Sınıfa katıldın: 9-A İngilizce')).toBeTruthy();
});
