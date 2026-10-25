/**
 * The student class screen (madde 5, wave 2b): Duyurular are all visible,
 * newest first, with NO reply input anywhere; Ödevler carry the caller's own
 * status (bitti ✓ / devam / gecikti) with "bitti" rows vanishing 3 days past
 * the deadline; the class league highlights the own row.
 */
import { render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { courses } from '@/content';
import { DEFAULT_STATS } from '@/data';
import { useAppStore } from '@/features/store';
import { localDateIso } from '@/features/classes/classView';
import { useClassStore } from '@/features/classes/classStore';

import ClassScreen from '@/app/sinif/[classId]';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ classId: 'c1' }),
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
const unit3 = trEn.units[2]!;

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateIso(d);
}

const CLASS = { classId: 'c1', ad: '9-A İngilizce', courseId: 'tr-en' as const, takmaAd: 'YıldızKedi', joinedAt: '2026-10-20T10:00:00.000Z' };

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({
    progress: Object.fromEntries(unit1.lessons.map((l) => [l.id, { lessonId: l.id, completedAt: 1, crowns: 1 }])),
    stats: { ...DEFAULT_STATS },
  });
  useClassStore.setState({
    myClasses: [CLASS],
    assignments: {
      c1: [
        // bitti, within 3 days of the deadline → visible as "bitti ✓"
        { id: 'a1', classId: 'c1', unitId: unit1.id, sonTarih: isoDaysFromToday(-1), createdAt: '2026-10-20T08:00:00.000Z' },
        // devam
        { id: 'a2', classId: 'c1', unitId: unit2.id, sonTarih: isoDaysFromToday(3), createdAt: '2026-10-21T08:00:00.000Z' },
        // gecikti
        { id: 'a3', classId: 'c1', unitId: unit3.id, sonTarih: isoDaysFromToday(-2), createdAt: '2026-10-22T08:00:00.000Z' },
        // bitti long ago → hidden
        { id: 'a4', classId: 'c1', unitId: unit1.id, sonTarih: isoDaysFromToday(-10), createdAt: '2026-10-10T08:00:00.000Z' },
      ],
    },
    announcements: {
      c1: [
        { id: 'n2', metin: 'Yeni duyuru: proje teslimi Pazartesi.', createdAt: '2026-10-25T09:00:00.000Z' },
        { id: 'n1', metin: 'Eski duyuru: kitapçık sayfa 12.', createdAt: '2026-10-20T09:00:00.000Z' },
      ],
    },
    league: {
      c1: [
        { takmaAd: 'MaviKedi', weeklyXp: 80, isMe: false },
        { takmaAd: 'YıldızKedi', weeklyXp: 45, isMe: true },
      ],
    },
    loading: false,
    error: null,
    load: jest.fn(async () => {}) as unknown as () => Promise<void>,
  });
});

async function renderClass() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ClassScreen />
    </SafeAreaProvider>,
  );
}

it('lists all announcements newest first with relative timestamps and NO reply input', async () => {
  await renderClass();
  const headings = screen.getAllByText('Duyurular');
  // Order: the newer announcement text appears before the older one in the tree.
  const tree = screen.toJSON();
  const text = JSON.stringify(tree);
  expect(text.indexOf('Yeni duyuru: proje teslimi Pazartesi.')).toBeLessThan(
    text.indexOf('Eski duyuru: kitapçık sayfa 12.'),
  );
  expect(screen.getByText('Yeni duyuru: proje teslimi Pazartesi.')).toBeTruthy();
  expect(screen.getByText('Eski duyuru: kitapçık sayfa 12.')).toBeTruthy();
  expect(headings).toHaveLength(1);
  // Read-only by design: not a single text input on the class screen.
  expect(JSON.stringify(screen.toJSON())).not.toContain('TextInput');
});

it('shows each assignment with MY status: bitti ✓, devam with due label, gecikti; stale done rows vanish', async () => {
  await renderClass();
  expect(screen.getByLabelText(`Ödev: ${unit1.title}, bitti, ${unit1.lessons.length}/${unit1.lessons.length} ders`)).toBeTruthy();
  expect(screen.getByText('bitti ✓')).toBeTruthy();
  expect(screen.getByLabelText(`Ödev: ${unit2.title}, devam, 0/${unit2.lessons.length} ders`)).toBeTruthy();
  expect(screen.getByText('gecikti')).toBeTruthy();
  // unit1 appears only once: the long-done duplicate row (a4) is hidden.
  expect(screen.getAllByLabelText(new RegExp(`Ödev: ${unit1.title}`))).toHaveLength(1);
});

it('renders the class league with the own row highlighted', async () => {
  await renderClass();
  const mine = screen.getByLabelText('Sıra 2: YıldızKedi, 45 XP, sen');
  expect(mine).toHaveProp('accessibilityState', { selected: true });
  expect(within(mine).getByText(/YıldızKedi \(sen\)/)).toBeTruthy();
  expect(screen.getByLabelText('Sıra 1: MaviKedi, 80 XP')).toBeTruthy();
});

it('tells non-members they are not in the class', async () => {
  useClassStore.setState({ myClasses: [] });
  await renderClass();
  expect(screen.getByText('Bu sınıfta değilsin ya da sınıf arşivlendi.')).toBeTruthy();
});
