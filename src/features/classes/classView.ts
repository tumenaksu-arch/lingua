import type { MyClassDoc } from '@/data/remote/classes';

/**
 * Pure view helpers for the student class UI (madde 5, wave 2b): join-code and
 * nickname validation, the Turkish assignment due label, relative announcement
 * times and which rows a screen should show. No network here.
 */

/** Join codes: 6 chars from the migration's unambiguous alphabet (no I/O/0/1). */
export const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/** Class nickname: 3–20 chars, letters (Turkish included), digits, space, . _ - (matches the DB check). */
export const TAKMA_AD_PATTERN = /^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]{3,20}$/;

/** Uppercases and strips everything outside the join-code alphabet while typing. */
export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6);
}

/** Local date as 'YYYY-MM-DD' — the same convention as assignments.son_tarih. */
export function localDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAY_DATIVE: Record<string, string> = {
  Pazar: "Pazar'a",
  Pazartesi: "Pazartesi'ye",
  Salı: "Salı'ya",
  Çarşamba: "Çarşamba'ya",
  Perşembe: "Perşembe'ye",
  Cuma: "Cuma'ya",
  Cumartesi: "Cumartesi'ye",
};
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/**
 * The due label for an assignment row: "Bugüne kadar" / "Yarına kadar" /
 * "Cuma'ya kadar" (weekday when within the next week) / "gecikti" once the
 * inclusive deadline has passed. Farther deadlines get "GG.AA. tarihine kadar".
 */
export function dueLabel(sonTarih: string, today: Date): string {
  const todayIso = localDateIso(today);
  if (todayIso > sonTarih) return 'gecikti';
  if (todayIso === sonTarih) return 'Bugüne kadar';
  const due = new Date(`${sonTarih}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((due.getTime() - startOfToday) / 86_400_000);
  if (diffDays === 1) return 'Yarına kadar';
  if (diffDays < 7) return `${WEEKDAY_DATIVE[WEEKDAYS[due.getDay()]!]} kadar`;
  return `${sonTarih.slice(8, 10)}.${sonTarih.slice(5, 7)}. tarihine kadar`;
}

/** "şimdi" / "5 dk önce" / "2 sa önce" / "3 gün önce" / "GG.AA.YYYY" for an announcement timestamp. */
export function relativeTime(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, nowMs - then);
  if (diff < 60_000) return 'şimdi';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  const d = new Date(then);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}.${m}.${d.getFullYear()}`;
}

/**
 * An assignment row disappears from the lists once it is done AND the
 * deadline is more than 3 days past ("bitti ✓" lingers briefly, then the row
 * is cleaned up). Everything not-yet-done stays visible (incl. "gecikti").
 */
export function isAssignmentVisible(status: 'bitti' | 'devam' | 'gecikti', sonTarih: string, today: Date): boolean {
  if (status !== 'bitti') return true;
  const due = new Date(`${sonTarih}T00:00:00`).getTime();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return startOfToday <= due + 3 * 86_400_000;
}

/** The class shown on the home card: the one teaching the active course, else the first membership. */
export function pickHomeClass(myClasses: MyClassDoc[], courseId: string): MyClassDoc | null {
  return myClasses.find((c) => c.courseId === courseId) ?? myClasses[0] ?? null;
}
