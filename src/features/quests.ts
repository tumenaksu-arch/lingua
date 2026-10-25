/**
 * Daily quests (roadmap item 3a, local-only): every local day the user gets
 * exactly 3 quests, chosen deterministically from the local date string so the
 * same date yields the same quests on every device. Pure module — no React, no DB.
 */

export interface Quest {
  id: string;
  title: string;
  target: number;
}

export interface QuestStatus extends Quest {
  /** progress, clamped to target */
  current: number;
  done: boolean;
  claimed: boolean;
}

/** The pool of quests with stable ids. `xp_goal`'s target is set per user (dailyGoalXp). */
export const QUEST_POOL: readonly Quest[] = [
  { id: 'xp_goal', title: 'Günlük hedefin kadar XP kazan', target: 0 },
  { id: 'xp_50', title: '50 XP kazan', target: 50 },
  { id: 'lessons_2', title: '2 ders bitir', target: 2 },
  { id: 'lessons_3', title: '3 ders bitir', target: 3 },
  { id: 'perfect_1', title: 'Hatasız bir ders bitir', target: 1 },
  { id: 'story_1', title: 'Bir hikâye tamamla', target: 1 },
];

/** Never offer both members of a group on the same day. */
const EXCLUSIVE_GROUPS: readonly (readonly string[])[] = [
  ['xp_goal', 'xp_50'],
  ['lessons_2', 'lessons_3'],
];

/** XP awarded for claiming a completed quest. */
export const QUEST_REWARD_XP = 10;

/** A today's event as read from the SQLite `events` table. */
export interface QuestEvent {
  type: string;
  payload: Record<string, unknown>;
}

/** FNV-1a hash of the date string — a stable, device-independent seed. */
function seedFrom(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — tiny deterministic generator for the seeded shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The 3 quests for `date` (YYYY-MM-DD): a seeded Fisher–Yates shuffle of the
 * pool, taking the first 3 while skipping any quest whose exclusive group is
 * already represented. Same date → same quests everywhere; different dates
 * usually differ.
 */
export function questsForDate(date: string, dailyGoalXp: number): Quest[] {
  const rand = mulberry32(seedFrom(date));
  const pool = [...QUEST_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const picked: Quest[] = [];
  for (const q of pool) {
    if (picked.length >= 3) break;
    const group = EXCLUSIVE_GROUPS.find((g) => g.includes(q.id));
    if (group && picked.some((p) => group.includes(p.id))) continue;
    picked.push(q.id === 'xp_goal' ? { ...q, target: dailyGoalXp } : q);
  }
  return picked;
}

function valueFor(questId: string, counts: { xp: number; lessons: number; perfect: number; stories: number }): number {
  switch (questId) {
    case 'xp_goal':
    case 'xp_50':
      return counts.xp;
    case 'lessons_2':
    case 'lessons_3':
      return counts.lessons;
    case 'perfect_1':
      return counts.perfect;
    case 'story_1':
      return counts.stories;
    default:
      return 0;
  }
}

/**
 * Computes the status of each quest from TODAY's local events. XP counts
 * `lesson_completed` + `story_completed` payloads only (quest rewards are
 * `quest_claimed` events and never feed quest progress). A lesson counts as
 * perfect when its payload says `perfect: true` (or, for older events, when
 * correct === total with total > 0). Claimed state comes from `quest_claimed`
 * events carrying the quest id.
 */
export function questProgress(quests: Quest[], todayEvents: QuestEvent[]): QuestStatus[] {
  const counts = { xp: 0, lessons: 0, perfect: 0, stories: 0 };
  const claimed = new Set<string>();
  for (const e of todayEvents) {
    if (e.type === 'lesson_completed') {
      counts.lessons++;
      counts.xp += Number(e.payload.xp ?? 0) || 0;
      const total = Number(e.payload.total ?? 0) || 0;
      const correct = Number(e.payload.correct ?? 0) || 0;
      if (e.payload.perfect === true || (total > 0 && correct === total)) counts.perfect++;
    } else if (e.type === 'story_completed') {
      counts.stories++;
      counts.xp += Number(e.payload.xp ?? 0) || 0;
    } else if (e.type === 'quest_claimed' && typeof e.payload.questId === 'string') {
      claimed.add(e.payload.questId);
    }
  }
  return quests.map((q) => {
    const current = Math.min(q.target, valueFor(q.id, counts));
    return { ...q, current, done: current >= q.target, claimed: claimed.has(q.id) };
  });
}
