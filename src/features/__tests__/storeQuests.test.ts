/**
 * Store integration for daily quests (roadmap item 3a) against FakeDb:
 * claiming pays 10 XP exactly once through the normal stats pipeline, the
 * weekly chart includes quest XP, and 3 claims unlock the quests_day badge.
 */
import { FakeDb } from '@/data/__tests__/fakeDb';
import { setDbForTesting } from '@/data';
import { localDateString } from '@/domain';
import type { QuestEvent } from '../quests';
import { useAppStore } from '../store';

let db: FakeDb;

/** Seeds today's events for the local user (bypasses repos — only the rows matter). */
function addTodayEvent(id: string, type: string, payload: Record<string, unknown>, createdAt = Date.now()) {
  db.tables.events ??= [];
  db.tables.events.push({
    id,
    user_id: 'local',
    type,
    payload: JSON.stringify(payload),
    created_at: createdAt,
  });
}

/** Makes every possible quest type completable today: 60 XP, 3 perfect lessons, 1 story. */
function seedFullDay() {
  addTodayEvent('l1', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true });
  addTodayEvent('l2', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true });
  addTodayEvent('l3', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true });
  addTodayEvent('s1', 'story_completed', { xp: 10, correct: 3, total: 4 });
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

test('boot refreshes quests: 3 quests for today, none done', () => {
  const quests = useAppStore.getState().quests;
  expect(quests).toHaveLength(3);
  expect(quests.every((q) => !q.done && !q.claimed && q.current === 0)).toBe(true);
});

test('refreshQuests reads today\'s events: seeded activity completes every quest', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quests = useAppStore.getState().quests;
  expect(quests).toHaveLength(3);
  expect(quests.every((q) => q.done && q.current === q.target)).toBe(true);
  expect(quests.every((q) => !q.claimed)).toBe(true);
});

test('claimQuest awards +10 XP once through the stats pipeline; a second claim returns 0 and logs one event', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  const xpBefore = useAppStore.getState().stats.xp;
  const xpTodayBefore = useAppStore.getState().stats.xpToday;

  const first = await useAppStore.getState().claimQuest(quest.id);
  expect(first.xpEarned).toBe(10);
  let s = useAppStore.getState();
  expect(s.stats.xp).toBe(xpBefore + 10);
  expect(s.stats.xpToday).toBe(xpTodayBefore + 10);
  expect(s.quests.find((q) => q.id === quest.id)?.claimed).toBe(true);

  const claims = (db.tables.events ?? []).filter((r) => r.type === 'quest_claimed');
  expect(claims).toHaveLength(1);
  const payload = JSON.parse(String(claims[0]!.payload)) as QuestEvent['payload'] & { xp: number; questId: string; date: string };
  expect(payload).toMatchObject({ xp: 10, questId: quest.id });

  const second = await useAppStore.getState().claimQuest(quest.id);
  expect(second.xpEarned).toBe(0);
  s = useAppStore.getState();
  expect(s.stats.xp).toBe(xpBefore + 10); // unchanged
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(1);
});

test('claimQuest on an unfinished quest returns 0 and changes nothing', async () => {
  const quest = useAppStore.getState().quests[0]!;
  const out = await useAppStore.getState().claimQuest(quest.id);
  expect(out.xpEarned).toBe(0);
  expect(useAppStore.getState().stats.xp).toBe(0);
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(0);
});

test('quest reward XP flows through the daily-goal / xp_today pipeline', async () => {
  await useAppStore.getState().setDailyGoal(15);
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const done = useAppStore.getState().quests.filter((q) => q.done);
  expect(done.length).toBeGreaterThanOrEqual(3);
  expect(useAppStore.getState().stats.xpToday).toBe(0); // events alone don't touch stats

  await useAppStore.getState().claimQuest(done[0]!.id);
  expect(useAppStore.getState().stats.xpToday).toBe(10);
  // the second reward crosses the daily goal → goal streak registered
  await useAppStore.getState().claimQuest(done[1]!.id);
  expect(useAppStore.getState().stats.xpToday).toBe(20);
  const meta = (db.tables.sync_meta ?? []).find((r) => r.key === 'goal_streak');
  expect(JSON.parse(String(meta?.value)).count).toBe(1);
});

test('weeklyXp includes quest reward XP in today\'s bucket', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  await useAppStore.getState().claimQuest(quest.id);
  const week = await useAppStore.getState().weeklyXp();
  expect(week).toHaveLength(7);
  expect(week[6]).toBe(80); // 70 from lessons+story + 10 quest reward
});

test('claimQuest double-tap: two overlapping claims pay +10 XP only once', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  const xpBefore = useAppStore.getState().stats.xp;

  // Both presses pass the guard before either reaches the DB; the in-flight
  // marker must synchronously block the second one.
  const [first, second] = await Promise.all([
    useAppStore.getState().claimQuest(quest.id),
    useAppStore.getState().claimQuest(quest.id),
  ]);
  expect(first.xpEarned + second.xpEarned).toBe(10);
  expect(useAppStore.getState().stats.xp).toBe(xpBefore + 10);
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(1);
});

test('claiming a quest left over from a previous day returns 0 and changes nothing', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  // Simulate the app sitting open overnight: quests state is stale, the quest
  // is done and unclaimed, but it belongs to yesterday — it must NOT pay out
  // attributed to today.
  useAppStore.setState({ questDate: '2020-01-01' });
  const out = await useAppStore.getState().claimQuest(quest.id);
  expect(out.xpEarned).toBe(0);
  expect(useAppStore.getState().stats.xp).toBe(0);
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(0);
});

test('claim is refused when the quest_claimed event already exists (stats and log stay consistent)', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  const quest = useAppStore.getState().quests[0]!;
  // Pre-existing claim event (e.g. written by another process) that the stale
  // in-memory state doesn't know about.
  const today = localDateString(new Date());
  addTodayEvent(`quest:${today}:${quest.id}`, 'quest_claimed', { xp: 10, questId: quest.id, date: today });
  const out = await useAppStore.getState().claimQuest(quest.id);
  expect(out.xpEarned).toBe(0);
  expect(useAppStore.getState().stats.xp).toBe(0);
  expect((db.tables.events ?? []).filter((r) => r.type === 'quest_claimed')).toHaveLength(1);
});

test('setDailyGoal refreshes quests immediately (xp_goal target never goes stale)', async () => {
  useAppStore.setState({ questDate: '2020-01-01' });
  await useAppStore.getState().setDailyGoal(50);
  expect(useAppStore.getState().questDate).toBe(localDateString(new Date()));
  const goal = useAppStore.getState().quests.find((q) => q.id === 'xp_goal');
  if (goal) expect(goal.target).toBe(50);
});

test("quest progress window ends at next local midnight (25h DST fall-back day)", async () => {
  const RealDate = Date;
  // Jest workers pin libc's TZ at process start, so simulate America/New_York
  // on 2026-11-01 (fall back EDT → EST at 06:00Z) with a Date stand-in pinned
  // to noon EDT: local getters apply the right UTC offset for each instant.
  const NOON = new RealDate('2026-11-01T12:00:00-04:00').getTime(); // 16:00Z
  const EDT = -240 * 60_000;
  const EST = -300 * 60_000;
  const TRANSITION = RealDate.UTC(2026, 10, 1, 6); // 2026-11-01T06:00Z
  class PinnedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(NOON);
      else super(...(args as []));
    }
    static override now() { return NOON; }
    private offsetMs(t: number) { return t < TRANSITION ? EDT : EST; }
    /** Fake-local time as a real UTC date (add the negative west offset). */
    private asLocal() { return new RealDate(this.getTime() + this.offsetMs(this.getTime())); }
    override getFullYear() { return this.asLocal().getUTCFullYear(); }
    override getMonth() { return this.asLocal().getUTCMonth(); }
    override getDate() { return this.asLocal().getUTCDate(); }
    override getTimezoneOffset() { return -this.offsetMs(this.getTime()) / 60_000; }
    override setHours(h: number, min = 0, s = 0, ms = 0) {
      const l = this.asLocal();
      const utc = RealDate.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), h, min, s, ms);
      let t = utc - this.offsetMs(this.getTime());
      t = utc - this.offsetMs(t); // re-evaluate: target may cross the transition
      this.setTime(t);
      return t;
    }
    override setDate(day: number) {
      const l = this.asLocal();
      const utc = RealDate.UTC(l.getUTCFullYear(), l.getUTCMonth(), day, l.getUTCHours(), l.getUTCMinutes(), l.getUTCSeconds(), l.getUTCMilliseconds());
      let t = utc - this.offsetMs(this.getTime());
      t = utc - this.offsetMs(t);
      this.setTime(t);
      return t;
    }
  }
  (globalThis as { Date: DateConstructor }).Date = PinnedDate as unknown as DateConstructor;
  try {
    // Finished at 23:30 local (EST) = 04:30Z: inside the local day, but BEYOND
    // `dayStart(04:00Z) + 86_400_000` — a fixed 24h span would wrongly drop it.
    addTodayEvent('l1', 'lesson_completed', { xp: 20, correct: 8, total: 8, perfect: true }, new RealDate('2026-11-01T23:30:00-05:00').getTime());
    await useAppStore.getState().refreshQuests();
    const quests = useAppStore.getState().quests;
    expect(quests).toHaveLength(3);
    expect(quests.some((q) => q.id !== 'story_1' && q.current > 0)).toBe(true);
  } finally {
    (globalThis as { Date: DateConstructor }).Date = RealDate;
  }
});

test('claiming all 3 of today\'s quests unlocks the quests_day achievement once', async () => {
  seedFullDay();
  await useAppStore.getState().refreshQuests();
  for (const q of useAppStore.getState().quests) {
    await useAppStore.getState().claimQuest(q.id);
  }
  const s = useAppStore.getState();
  expect(s.achievements).toContain('quests_day');
  expect(s.newAchievements).toContain('quests_day');
  // stays unlocked; never revoked, never duplicated
  await useAppStore.getState().refreshQuests();
  expect(useAppStore.getState().achievements.filter((id) => id === 'quests_day')).toHaveLength(1);
});
