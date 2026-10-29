import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

import { getCourse } from '@/content';
import { DEFAULT_STATS, type LessonProgress } from '@/data';
import { proficiencyScore } from '@/domain/proficiency';
import { useAppStore } from '@/features/store';
import { useSettingsStore } from '@/ui/settingsStore';

import ProfileScreen from '@/app/(tabs)/profile';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => cb(), [cb]);
  },
}));

const originalOS = Platform.OS;
const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

const course = getCourse('tr-en')!;

/** 8 ünitenin tüm dersleri + ilk 3 hikâye → 32 + 3 = 35 puan, A2. */
function complete8Units() {
  const progress: Record<string, LessonProgress> = {};
  course.units.slice(0, 8).forEach((u, i) => {
    for (const l of u.lessons) progress[l.id] = { lessonId: l.id, crowns: 1, completedAt: 1 };
    if (i < 3) progress[`${u.id}.story`] = { lessonId: `${u.id}.story`, crowns: 1, completedAt: 1 };
  });
  useAppStore.setState({ stats: { ...DEFAULT_STATS }, progress, course });
}

beforeEach(() => {
  setOS('web');
  complete8Units();
  useSettingsStore.setState({ soundEnabled: true, slowRate: 0.6, relaxedHearts: false, voice: 'dogal', hydrated: true });
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://supa.example.test';
  (globalThis as { caches?: unknown }).caches = {
    open: async () => ({ match: async () => undefined, put: async () => {} }),
  };
});

afterEach(() => {
  setOS(originalOS);
  delete (globalThis as { caches?: unknown }).caches;
});

async function renderProfile() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ProfileScreen />
    </SafeAreaProvider>,
  );
}

it('shows the Love-Vox score card with level and the remaining-points caption', async () => {
  const p = proficiencyScore(course, useAppStore.getState().progress);
  expect(p.score).toBe(35);

  await renderProfile();

  expect(screen.getByText('Love-Vox puanı')).toBeTruthy();
  expect(screen.getByText(`${p.score} · ${p.level}`)).toBeTruthy();
  expect(screen.getByText(`B1'e ${80 - p.score} puan kaldı`)).toBeTruthy();
});

it('web shows the offline voice-pack section with the download button', async () => {
  await renderProfile();

  expect(screen.getByText('Çevrimdışı')).toBeTruthy();
  const button = await screen.findByRole('button', { name: /Bu kursun seslerini indir/ });
  expect(button).toBeTruthy();
});

it('the offline section is hidden on native platforms', async () => {
  setOS('ios');
  await renderProfile();

  expect(screen.queryByText('Çevrimdışı')).toBeNull();
  expect(screen.queryByRole('button', { name: /Bu kursun seslerini indir/ })).toBeNull();
});

it('deleting the voice pack resets the card to the download button', async () => {
  const deleted: string[] = [];
  // Önbellek dolu gibi davranır; delete çağrılınca boşalır.
  let filled = true;
  (globalThis as { caches?: unknown }).caches = {
    open: async () => ({ match: async () => (filled ? { cached: true } : undefined), put: async () => {} }),
    delete: async (name: string) => {
      deleted.push(name);
      filled = false;
      return true;
    },
  };

  await renderProfile();

  const deleteButton = await screen.findByRole('button', { name: 'İndirildi ✓ · Sil' });
  await fireEvent.press(deleteButton);

  await waitFor(() => expect(deleted).toEqual(['lovevox-tts-v1']));
  expect(await screen.findByRole('button', { name: /Bu kursun seslerini indir/ })).toBeTruthy();
});
