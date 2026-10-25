import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';

import { DEFAULT_STATS, LOCAL_USER_ID } from '@/data';
import {
  becomeTeacher,
  classLeague,
  classProgress,
  classStruggles,
  createClass,
  deleteAnnouncement,
  isTeacher,
  listAnnouncements,
  listAssignments,
  listMyClasses,
  postAnnouncement,
} from '@/data/remote/classes';
import { useAppStore } from '@/features/store';
import { ClassDetail } from '@/features/teacher/classDetail';
import { TeacherHome } from '@/features/teacher/teacherHome';

import OgretmenScreen from '@/app/ogretmen';
import ProfileScreen from '@/app/(tabs)/profile';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    back: (...args: unknown[]) => mockRouterBack(...args),
    replace: jest.fn(),
  },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

// The panel talks to Supabase ONLY through this module — every test below
// fails if the corresponding feature stops using it.
jest.mock('@/data/remote/classes', () => ({
  isTeacher: jest.fn(),
  becomeTeacher: jest.fn(),
  listMyClasses: jest.fn(),
  createClass: jest.fn(),
  classProgress: jest.fn(),
  listAssignments: jest.fn(),
  createAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
  listAnnouncements: jest.fn(),
  postAnnouncement: jest.fn(),
  deleteAnnouncement: jest.fn(),
  classStruggles: jest.fn(),
  classLeague: jest.fn(),
  regenerateCode: jest.fn(),
  archiveClass: jest.fn(),
  removeMember: jest.fn(),
}));

// Small fake course: two units, 'u1' with two lessons and 'u2' with one.
jest.mock('@/content', () => {
  const lesson = (id: string, order: number) => ({ id, order, exercises: [], vocabIds: [] });
  const mockCourse = {
    id: 'tr-en',
    fromLang: 'tr',
    toLang: 'en',
    title: 'İngilizce',
    vocab: [],
    units: [
      { id: 'u1', order: 1, title: 'Temeller', description: '', lessons: [lesson('u1.l1', 1), lesson('u1.l2', 2)] },
      { id: 'u2', order: 2, title: 'Alışveriş', description: '', lessons: [lesson('u2.l1', 1)] },
    ],
  };
  return { courses: [mockCourse], getCourse: jest.fn(() => mockCourse), getVocab: jest.fn(() => []) };
});

// The profile entry row is additionally gated on the cloud being configured.
jest.mock('@/data', () => ({ ...jest.requireActual('@/data'), isSupabaseConfigured: () => true }));

const mocked = {
  isTeacher: jest.mocked(isTeacher),
  becomeTeacher: jest.mocked(becomeTeacher),
  listMyClasses: jest.mocked(listMyClasses),
  createClass: jest.mocked(createClass),
  classProgress: jest.mocked(classProgress),
  listAssignments: jest.mocked(listAssignments),
  listAnnouncements: jest.mocked(listAnnouncements),
  postAnnouncement: jest.mocked(postAnnouncement),
  deleteAnnouncement: jest.mocked(deleteAnnouncement),
  classStruggles: jest.mocked(classStruggles),
  classLeague: jest.mocked(classLeague),
};

const CLASS = {
  id: 'c1',
  ad: '9-A İngilizce',
  courseId: 'tr-en' as const,
  joinCode: 'ABC123',
  createdAt: '2026-10-20T00:00:00.000Z',
  archivedAt: null,
};
const SIGNED_IN = { uid: 'u1', email: 'ogretmen@ornek.com', displayName: null };

async function renderWithArea(element: React.ReactElement) {
  await render(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ user: null, userId: LOCAL_USER_ID, db: null, stats: { ...DEFAULT_STATS }, progress: {} });
  mocked.isTeacher.mockResolvedValue(true);
  mocked.listMyClasses.mockResolvedValue([CLASS]);
  mocked.classProgress.mockResolvedValue([]);
  mocked.listAssignments.mockResolvedValue([]);
  mocked.listAnnouncements.mockResolvedValue([]);
  mocked.classStruggles.mockResolvedValue([]);
  mocked.classLeague.mockResolvedValue([]);
});

describe('profile entry row', () => {
  it('is visible for e-mail accounts and navigates to /ogretmen', async () => {
    useAppStore.setState({ user: SIGNED_IN });
    await renderWithArea(<ProfileScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Öğretmen paneli' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/ogretmen');
  });

  it('is hidden for guests and anonymous (e-mail-less) accounts', async () => {
    useAppStore.setState({ user: null });
    await renderWithArea(<ProfileScreen />);
    expect(screen.queryByRole('button', { name: 'Öğretmen paneli' })).toBeNull();

    useAppStore.setState({ user: { uid: 'u9', email: null, displayName: null } });
    await renderWithArea(<ProfileScreen />);
    expect(screen.queryByRole('button', { name: 'Öğretmen paneli' })).toBeNull();
  });
});

describe('teacher gate', () => {
  it('first visit shows the KVKK info card and accepting calls becomeTeacher', async () => {
    mocked.isTeacher.mockResolvedValue(false);
    mocked.becomeTeacher.mockResolvedValue(true);
    await renderWithArea(<TeacherHome />);

    expect(await screen.findByText(/yalnızca takma adlarıyla görünür/)).toBeTruthy();
    expect(screen.getByText(/cevaplara ve e-posta adreslerine erişemezsin/)).toBeTruthy();
    expect(mocked.becomeTeacher).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'KVKK metnini kabul et' }));
    await waitFor(() => expect(mocked.becomeTeacher).toHaveBeenCalledTimes(1));
    // After the consent the class list loads.
    await screen.findByRole('button', { name: 'Sınıf aç' });
    expect(mocked.listMyClasses).toHaveBeenCalled();
  });

  it('guests and anonymous users get a friendly message with a "Giriş yap" button', async () => {
    useAppStore.setState({ user: null });
    await renderWithArea(<OgretmenScreen />);
    expect(screen.getByText(/bir hesap gerektirir/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/auth');

    useAppStore.setState({ user: { uid: 'u9', email: null, displayName: null } });
    await renderWithArea(<OgretmenScreen />);
    expect(screen.getByText(/Anonim öğrenci hesapları öğretmen panelini kullanamaz/)).toBeTruthy();
  });
});

describe('class creation', () => {
  it('the form blocks submit without the parent-confirmation checkbox', async () => {
    await renderWithArea(<TeacherHome />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Sınıf aç' }));
    await fireEvent.changeText(screen.getByLabelText('Sınıf adı'), '9-A İngilizce');
    await fireEvent.press(screen.getByRole('button', { name: 'Sınıfı oluştur' }));

    expect(mocked.createClass).not.toHaveBeenCalled();
    expect(screen.getByText(/velileri bilgilendirdiğini onaylamalısın/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Velileri bilgilendirdim; öğrenciler yalnız takma adla katılır' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sınıfı oluştur' }));
    await waitFor(() =>
      expect(mocked.createClass).toHaveBeenCalledWith({ ad: '9-A İngilizce', courseId: 'tr-en', veliBilgilendirildi: true }),
    );
  });
});

describe('class detail', () => {
  const MEMBERS = [
    {
      userId: 'u1',
      takmaAd: 'Torpil',
      joinedAt: '2026-10-20T00:00:00.000Z',
      weeklyXp: 5,
      totalXp: 100,
      streak: 3,
      lastActiveDate: null,
      completedLessons: [] as string[],
    },
    {
      userId: 'u2',
      takmaAd: 'HızlıAyı',
      joinedAt: '2026-10-21T00:00:00.000Z',
      weeklyXp: 50,
      totalXp: 60,
      streak: 1,
      lastActiveDate: '2026-10-26',
      completedLessons: ['u1.l1'],
    },
  ];

  it('shows the join code and ranks students by weekly XP', async () => {
    mocked.classProgress.mockResolvedValue(MEMBERS);
    await renderWithArea(<ClassDetail classId="c1" />);

    expect(await screen.findByLabelText('Sınıf kodu ABC123')).toBeTruthy();
    expect(await screen.findByLabelText('1. HızlıAyı, bu hafta 50 XP')).toBeTruthy();
    expect(screen.getByLabelText('2. Torpil, bu hafta 5 XP')).toBeTruthy();
    // No e-mail ever appears on a teacher screen.
    expect(screen.queryByText(/@ornek/)).toBeNull();
  });

  it('empty class explains how students join and shows the code', async () => {
    mocked.classProgress.mockResolvedValue([]);
    await renderWithArea(<ClassDetail classId="c1" />);

    expect(await screen.findByText(/Henüz öğrenci yok/)).toBeTruthy();
    expect(screen.getAllByText('ABC123').length).toBeGreaterThan(0);
    expect(screen.getByText(/Sınıf koduyla katıl/)).toBeTruthy();
  });

  it('assignments show bitti/devam/gecikti counts from the class progress', async () => {
    mocked.classProgress.mockResolvedValue([
      { ...MEMBERS[0]!, completedLessons: ['u1.l1', 'u1.l2'] },
      { ...MEMBERS[1]!, completedLessons: ['u1.l1'] },
    ]);
    mocked.listAssignments.mockResolvedValue([
      { id: 'a1', classId: 'c1', unitId: 'u1', sonTarih: '2999-01-01', createdAt: '2026-10-25T00:00:00.000Z' },
      { id: 'a2', classId: 'c1', unitId: 'u2', sonTarih: '2000-01-01', createdAt: '2026-10-25T00:00:00.000Z' },
    ]);
    await renderWithArea(<ClassDetail classId="c1" />);

    await fireEvent.press(await screen.findByRole('tab', { name: 'ÖDEVLER' }));
    expect(await screen.findByText('Bitti: 1')).toBeTruthy();
    expect(screen.getByText('Devam: 1')).toBeTruthy();
    expect(screen.getByText('Gecikti: 2')).toBeTruthy();

    // Expand the first assignment to see member names per status.
    await fireEvent.press(screen.getByRole('button', { name: 'Ünite 1: Temeller detayı' }));
    expect(screen.getByText('Bitti: Torpil')).toBeTruthy();
    expect(screen.getByText('Devam: HızlıAyı')).toBeTruthy();
  });

  it('announcements post and delete through the client', async () => {
    let stored: { id: string; classId: string; metin: string; createdAt: string }[] = [];
    mocked.listAnnouncements.mockImplementation(async () => stored);
    mocked.postAnnouncement.mockImplementation(async (classId: string, metin: string) => {
      const doc = { id: `a${stored.length + 1}`, classId, metin, createdAt: new Date().toISOString() };
      stored = [...stored, doc];
      return doc;
    });
    mocked.deleteAnnouncement.mockImplementation(async (id: string) => {
      stored = stored.filter((d) => d.id !== id);
      return true;
    });
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title?: string, _message?: string, buttons?: Parameters<typeof Alert.alert>[2]) => {
        buttons?.find((b) => b.style === 'destructive')?.onPress?.();
      });
    await renderWithArea(<ClassDetail classId="c1" />);

    await fireEvent.press(await screen.findByRole('tab', { name: 'DUYURULAR' }));
    expect(screen.getByText(/yanıt veremez/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Duyuru metni'), 'Yarın sınav yok');
    expect(screen.getByText('15/500')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Duyuruyu gönder' }));
    await waitFor(() => expect(mocked.postAnnouncement).toHaveBeenCalledWith('c1', 'Yarın sınav yok'));
    expect(await screen.findByText('Yarın sınav yok')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Duyuruyu sil' }));
    await waitFor(() => expect(mocked.deleteAnnouncement).toHaveBeenCalledWith('a1'));
    expect(screen.queryByText('Yarın sınav yok')).toBeNull();
    alertSpy.mockRestore();
  });

  it('struggles list units by ascending accuracy and types by most mistakes', async () => {
    mocked.classStruggles.mockResolvedValue([
      { lessonId: 'u2.l1', attempts: 10, correct: 9, total: 10, mistakesByType: { speak: 2 } },
      { lessonId: 'u1.l1', attempts: 10, correct: 1, total: 10, mistakesByType: { match_pairs: 5 } },
    ]);
    await renderWithArea(<ClassDetail classId="c1" />);

    await fireEvent.press(await screen.findByRole('tab', { name: 'ZORLANILANLAR' }));
    const unitLabels = screen.getAllByText(/Ünite \d+: /).map((el) => String(el.props.children));
    expect(unitLabels[0]).toContain('Temeller'); // 10% before 90%
    expect(unitLabels[1]).toContain('Alışveriş');
    const typeLabels = screen.getAllByText(/Eşleştirme|Konuşma/).map((el) => String(el.props.children));
    expect(typeLabels[0]).toBe('Eşleştirme'); // 5 mistakes before 2
    expect(typeLabels[1]).toBe('Konuşma');
  });

  it('struggles empty state shows when there is no 30-day data', async () => {
    await renderWithArea(<ClassDetail classId="c1" />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'ZORLANILANLAR' }));
    expect(await screen.findByText(/Son 30 günde yeterli veri yok/)).toBeTruthy();
  });

  it('league tab ranks the class by weekly XP', async () => {
    mocked.classLeague.mockResolvedValue([
      { takmaAd: 'HızlıAyı', weeklyXp: 50, isMe: false },
      { takmaAd: 'Torpil', weeklyXp: 5, isMe: false },
    ]);
    await renderWithArea(<ClassDetail classId="c1" />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'LİG' }));
    expect(await screen.findByLabelText('Sıra 1: HızlıAyı, 50 XP')).toBeTruthy();
    expect(screen.getByLabelText('Sıra 2: Torpil, 5 XP')).toBeTruthy();
  });
});
