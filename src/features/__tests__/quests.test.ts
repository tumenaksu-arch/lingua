/**
 * Pure daily-quest logic (roadmap item 3a): deterministic per-date selection,
 * exclusivity rules and progress counting from today's events.
 */
import { QUEST_POOL, questProgress, questsForDate, type Quest, type QuestEvent } from '../quests';

const IDS = QUEST_POOL.map((q) => q.id);

function datePlus(base: string, days: number): string {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe('questsForDate', () => {
  test('returns exactly 3 known quests for every one of 60 consecutive dates', () => {
    for (let i = 0; i < 60; i++) {
      const date = datePlus('2026-01-01', i);
      const quests = questsForDate(date, 20);
      expect(quests).toHaveLength(3);
      for (const q of quests) {
        expect(IDS).toContain(q.id);
        expect(q.target).toBeGreaterThan(0);
      }
    }
  });

  test('is deterministic: same date + same goal → same quests, independent of goal for others', () => {
    for (let i = 0; i < 10; i++) {
      const date = datePlus('2026-03-10', i);
      expect(questsForDate(date, 20)).toEqual(questsForDate(date, 20));
      expect(questsForDate(date, 20).map((q) => q.id)).toEqual(questsForDate(date, 50).map((q) => q.id));
    }
  });

  test('different dates (usually) give different selections across 60 days', () => {
    const signatures = new Set(
      Array.from({ length: 60 }, (_, i) => questsForDate(datePlus('2026-01-01', i), 20).map((q) => q.id).join(',')),
    );
    expect(signatures.size).toBeGreaterThan(1);
  });

  test('never offers both xp_goal and xp_50, nor both lessons_2 and lessons_3', () => {
    for (let i = 0; i < 60; i++) {
      const ids = questsForDate(datePlus('2026-01-01', i), 20).map((q) => q.id);
      expect(ids.includes('xp_goal') && ids.includes('xp_50')).toBe(false);
      expect(ids.includes('lessons_2') && ids.includes('lessons_3')).toBe(false);
    }
  });

  test('xp_goal target follows the daily goal; other targets are fixed', () => {
    for (let i = 0; i < 60; i++) {
      const quests = questsForDate(datePlus('2026-01-01', i), 35);
      const goal = quests.find((q) => q.id === 'xp_goal');
      if (goal) expect(goal.target).toBe(35);
      const xp50 = quests.find((q) => q.id === 'xp_50');
      if (xp50) expect(xp50.target).toBe(50);
    }
  });
});

describe('questProgress', () => {
  const quests: Quest[] = [
    { id: 'xp_goal', title: 'Günlük hedefin kadar XP kazan', target: 20 },
    { id: 'xp_50', title: '50 XP kazan', target: 50 },
    { id: 'lessons_2', title: '2 ders bitir', target: 2 },
    { id: 'perfect_1', title: 'Hatasız bir ders bitir', target: 1 },
    { id: 'story_1', title: 'Bir hikâye tamamla', target: 1 },
  ];

  test('empty day: all quests at 0, none done or claimed', () => {
    const statuses = questProgress(quests, []);
    for (const s of statuses) {
      expect(s).toMatchObject({ current: 0, done: false, claimed: false });
    }
  });

  test('xp counts lessons + stories but never quest rewards', () => {
    const events: QuestEvent[] = [
      { type: 'lesson_completed', payload: { xp: 15 } },
      { type: 'story_completed', payload: { xp: 10 } },
      { type: 'quest_claimed', payload: { xp: 10, questId: 'xp_50' } },
    ];
    const byId = Object.fromEntries(questProgress(quests, events).map((s) => [s.id, s]));
    expect(byId.xp_goal!.current).toBe(20); // clamped to its target
    expect(byId.xp_50!.current).toBe(25);
    // claiming a quest does not advance any progress counter
    expect(byId.xp_goal!.done).toBe(true);
    expect(byId.xp_50!.done).toBe(false);
  });

  test('lessons, perfect lessons and stories are counted from payloads', () => {
    const events: QuestEvent[] = [
      { type: 'lesson_completed', payload: { xp: 20, correct: 8, total: 8, perfect: true } },
      { type: 'lesson_completed', payload: { xp: 10, correct: 5, total: 8, perfect: false } },
      { type: 'lesson_completed', payload: { xp: 20, correct: 6, total: 6 } }, // legacy payload: perfect via correct === total
      { type: 'story_completed', payload: { xp: 14 } },
    ];
    const byId = Object.fromEntries(questProgress(quests, events).map((s) => [s.id, s]));
    expect(byId.lessons_2!.current).toBe(2); // clamped to target
    expect(byId.lessons_2!.done).toBe(true);
    expect(byId.perfect_1!.current).toBe(1);
    expect(byId.perfect_1!.done).toBe(true);
    expect(byId.story_1!.current).toBe(1);
    expect(byId.story_1!.done).toBe(true);
  });

  test('a lesson with total 0 is not perfect', () => {
    const byId = Object.fromEntries(
      questProgress(quests, [{ type: 'lesson_completed', payload: { xp: 5, correct: 0, total: 0 } }]).map((s) => [s.id, s]),
    );
    expect(byId.perfect_1!.current).toBe(0);
  });

  test('claimed state comes from quest_claimed events with matching questId', () => {
    const events: QuestEvent[] = [
      { type: 'lesson_completed', payload: { xp: 60 } },
      { type: 'quest_claimed', payload: { xp: 10, questId: 'xp_50', date: '2026-10-25' } },
    ];
    const byId = Object.fromEntries(questProgress(quests, events).map((s) => [s.id, s]));
    expect(byId.xp_50!.claimed).toBe(true);
    expect(byId.xp_goal!.claimed).toBe(false);
    expect(byId.xp_50!.done).toBe(true);
  });
});
