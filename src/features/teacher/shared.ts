import type { Course } from '@/domain/types';

/**
 * Pure display helpers for the teacher panel (madde 5, wave 2a — no network,
 * no React here). All date handling is local-time, matching the rest of the
 * app (week.ts, assignmentStatus.ts).
 */

const DAY_MS = 86_400_000;

function localDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * "bugün" / "dün" / "N gün önce" / "—" for a 'YYYY-MM-DD' last-active date,
 * compared against local midnight of `today`.
 *
 * Timezone convention (documented choice): `last_active_date` is the STUDENT's
 * device-local calendar date, and this compares it to the TEACHER's local
 * midnight — both sides are treated as plain calendar dates. Near midnight a
 * student a few timezones behind/ahead can show "dün" although they were
 * active minutes ago. That skew is accepted: the deployment is single-country
 * (Türkiye), and the alternative (storing/transferring a tz offset per member)
 * is not worth the privacy surface. If multi-tz deployment ever happens,
 * derive the label from an absolute timestamp instead.
 */
export function lastActiveLabel(lastActiveDate: string | null, today: Date): string {
  if (!lastActiveDate) return '—';
  const [y, m, d] = lastActiveDate.split('-').map(Number);
  if (!y || !m || !d) return '—';
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(y, m - 1, d).getTime();
  const days = Math.round((todayMidnight - target) / DAY_MS);
  if (days <= 0) return 'bugün';
  if (days === 1) return 'dün';
  return `${days} gün önce`;
}

/** The upcoming Friday (today counts) as 'YYYY-MM-DD' — the default deadline. */
export function nextFridayIso(today: Date): string {
  const offset = (5 - today.getDay() + 7) % 7;
  return localDateIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
}

/** Strict 'YYYY-MM-DD' validation, including a real calendar date. */
export function isDateIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.getFullYear() === y && date.getMonth() === m! - 1 && date.getDate() === d;
}

/** "şimdi" / "N dk önce" / "N sa önce" / "dün" / "N gün önce" for an ISO timestamp. */
export function relativeTimeLabel(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t) || t <= 0) return '—';
  const minutes = Math.floor((now.getTime() - t) / 60_000);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dün';
  return `${days} gün önce`;
}

/**
 * The unit the member is currently in: the first unit of the class course
 * with at least one uncompleted lesson, or null when the whole course is done.
 */
export function currentUnitLabel(course: Course | undefined, completedLessonIds: readonly string[]): string | null {
  const completed = new Set(completedLessonIds);
  const unit = course?.units.find((u) => u.lessons.some((l) => !completed.has(l.id)));
  return unit ? `Ünite ${unit.order}: ${unit.title}` : null;
}
