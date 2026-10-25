import type { SupabaseClient } from '@supabase/supabase-js';

import { weekStartMs } from '@/features/social/week';

import { randomInviteCode } from './social';
import { getSupabase } from './supabase';

/**
 * Teacher / class data on self-hosted Supabase (PostgREST + RLS, see
 * supabase/migrations/0002_siniflar.sql): teacher onboarding (KVKK consent),
 * classes with a join code, anonymous student membership via the join_class
 * RPC, assignments and the teacher summary RPCs (class_progress,
 * class_struggles) plus the class-internal league. Students join with a class
 * nickname only — no names, e-mails or school numbers are ever stored.
 * Every helper degrades gracefully: when Supabase is not configured (or the
 * session is missing, which RLS would reject) the functions return null / [] /
 * false, and write failures surface as Turkish Error messages for the screen.
 */

export type CourseId = 'tr-en' | 'tr-de' | 'tr-es' | 'tr-fr' | 'tr-it';

export interface ClassDoc {
  id: string;
  ad: string;
  courseId: CourseId;
  joinCode: string;
  createdAt: string;
  archivedAt: string | null;
}

export interface MemberDoc {
  classId: string;
  userId: string;
  takmaAd: string;
  joinedAt: string;
}

export interface AssignmentDoc {
  id: string;
  classId: string;
  unitId: string;
  /** Deadline as 'YYYY-MM-DD'. */
  sonTarih: string;
  createdAt: string;
}

export interface JoinedClass {
  classId: string;
  ad: string;
  courseId: CourseId;
}

export interface MyClassDoc extends JoinedClass {
  takmaAd: string;
  joinedAt: string;
}

export interface ProgressRow {
  userId: string;
  takmaAd: string;
  joinedAt: string;
  weeklyXp: number;
  totalXp: number;
  streak: number;
  lastActiveDate: string | null;
  completedLessons: string[];
}

export interface StruggleRow {
  lessonId: string;
  attempts: number;
  correct: number;
  total: number;
  mistakesByType: Record<string, number>;
}

export interface LeagueRow {
  takmaAd: string;
  weeklyXp: number;
  isMe: boolean;
}

export interface AnnouncementDoc {
  id: string;
  classId: string;
  metin: string;
  createdAt: string;
}

// PostgREST error shapes: network failures throw, API failures come back in `error`.
function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return /failed to fetch|networkerror|network request failed|timeout/i.test(e.message);
}

/** Maps PostgREST/fetch failures to a Turkish message the screens can show. */
function toTurkishError(e: unknown): Error {
  if (e instanceof Error && isNetworkError(e)) {
    return new Error('Bağlantı yok. İnternetini kontrol edip tekrar dene.');
  }
  const status = typeof e === 'object' && e && 'status' in e ? Number((e as { status: unknown }).status) : 0;
  if (status === 401 || status === 403) return new Error('Oturumun geçersiz. Lütfen tekrar giriş yap.');
  return e instanceof Error ? e : new Error(String(e));
}

/**
 * Write helpers return null/[]/false for guests too. RLS alone would turn a
 * missing session into a 401/403 throw, so check the session up front. When
 * the session state cannot be read (should not happen), let the call proceed
 * and the error mapping decide.
 */
async function hasSession(sb: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await sb.auth.getSession();
    return Boolean(data.session);
  } catch {
    return true;
  }
}

async function currentUid(sb: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Start of the current local ISO week (Monday 00:00) as an ISO string. */
function localWeekStartIso(): string {
  return new Date(weekStartMs(new Date())).toISOString();
}

function toClassDoc(row: Record<string, unknown>): ClassDoc {
  return {
    id: String(row.id),
    ad: String(row.ad),
    courseId: String(row.course_id) as CourseId,
    joinCode: String(row.join_code),
    createdAt: String(row.created_at ?? ''),
    archivedAt: (row.archived_at as string | null) ?? null,
  };
}

function toAssignmentDoc(row: Record<string, unknown>): AssignmentDoc {
  return {
    id: String(row.id),
    classId: String(row.class_id),
    unitId: String(row.unit_id),
    sonTarih: String(row.son_tarih),
    createdAt: String(row.created_at ?? ''),
  };
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/** True when the current session is an anonymous (GoTrue anonymous sign-in) user. */
export async function isAnonymousSession(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { data } = await sb.auth.getSession();
    return data.session?.user.is_anonymous === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

/** Whether the signed-in user has completed the teacher onboarding. */
export async function isTeacher(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const uid = await currentUid(sb);
    if (!uid) return false;
    const { data, error } = await sb.from('teachers').select('user_id').eq('user_id', uid).maybeSingle();
    if (error) return false;
    return data != null;
  } catch {
    return false;
  }
}

/**
 * Completes the teacher onboarding (inserts the teachers row with the KVKK
 * consent timestamp). E-mail accounts only — RLS rejects anonymous users.
 * An existing row (double submit) counts as success.
 */
export async function becomeTeacher(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const uid = await currentUid(sb);
    if (!uid) return false;
    const { error } = await sb.from('teachers').insert({ user_id: uid });
    if (error) {
      if (error.code === '23505') return true; // already a teacher
      throw toTurkishError(error);
    }
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

export interface CreateClassInput {
  /** Class name, 2–40 chars (e.g. '9-A İngilizce'). */
  ad: string;
  courseId: CourseId;
  /** Mandatory confirmation that the parents were informed (KVKK). */
  veliBilgilendirildi: boolean;
}

/**
 * Opens a class and returns it with its fresh 6-char join code. The code is
 * client-generated and retried with a fresh one on a unique violation (23505)
 * at most 5 times. Without the parent-confirmation the request never leaves
 * the client (the schema would reject it anyway).
 */
export async function createClass(input: CreateClassInput): Promise<ClassDoc | null> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return null;
  if (!input.veliBilgilendirildi) {
    throw new Error('Velileri bilgilendirdiğini onaylamalısın. Onaysız sınıf açılamaz.');
  }
  const uid = await currentUid(sb);
  if (!uid) return null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = {
      teacher_id: uid,
      ad: input.ad.trim(),
      course_id: input.courseId,
      join_code: randomInviteCode(),
      veli_bilgilendirildi: true,
    };
    try {
      const { data, error } = await sb.from('classes').insert(row).select('*').single();
      if (error) {
        lastError = error;
        if (error.code === '23505') continue; // join_code collision: draw a fresh one
        throw toTurkishError(error);
      }
      return toClassDoc(data as Record<string, unknown>);
    } catch (e) {
      if (e === lastError) throw e; // already mapped non-collision failure
      throw toTurkishError(e);
    }
  }
  throw new Error('Sınıf kodu üretilemedi. Lütfen tekrar dene.');
}

/** The caller's classes, newest first; archived ones only when requested. */
export async function listMyClasses(includeArchived = false): Promise<ClassDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const uid = await currentUid(sb);
    if (!uid) return [];
    const { data, error } = await sb
      .from('classes')
      .select('*')
      .eq('teacher_id', uid)
      .order('created_at', { ascending: false });
    if (error) return [];
    const rows = (data ?? []) as Record<string, unknown>[];
    return rows
      .map(toClassDoc)
      .filter((c) => includeArchived || c.archivedAt === null);
  } catch {
    return [];
  }
}

/** Renames a class the caller owns. */
export async function renameClass(classId: string, ad: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('classes').update({ ad: ad.trim() }).eq('id', classId);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

/**
 * Replaces the join code of a class the caller owns (the old code stops
 * working immediately). Retried on a unique violation at most 5 times;
 * returns the new code, or null when Supabase is not configured.
 */
export async function regenerateCode(classId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = randomInviteCode();
    try {
      const { error } = await sb.from('classes').update({ join_code: joinCode }).eq('id', classId);
      if (error) {
        lastError = error;
        if (error.code === '23505') continue; // join_code collision: draw a fresh one
        throw toTurkishError(error);
      }
      return joinCode;
    } catch (e) {
      if (e === lastError) throw e; // already mapped non-collision failure
      throw toTurkishError(e);
    }
  }
  throw new Error('Sınıf kodu üretilemedi. Lütfen tekrar dene.');
}

/**
 * Archives a class the caller owns. Archiving deletes all memberships
 * (KVKK: no lingering student data) and blocks the join code; un-archiving
 * is impossible (a trigger keeps archived_at).
 */
export async function archiveClass(classId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('classes').update({ archived_at: new Date().toISOString() }).eq('id', classId);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

/** Removes a member (student) from a class the caller owns. */
export async function removeMember(classId: string, userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('class_members').delete().eq('class_id', classId).eq('user_id', userId);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

// ---------------------------------------------------------------------------
// Assignments (teacher manages, members read)
// ---------------------------------------------------------------------------

/** The assignments of a class the caller owns or belongs to, by deadline. */
export async function listAssignments(classId: string): Promise<AssignmentDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('assignments')
      .select('*')
      .eq('class_id', classId)
      .order('son_tarih', { ascending: true });
    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map(toAssignmentDoc);
  } catch {
    return [];
  }
}

/**
 * Assigns a unit with a 'YYYY-MM-DD' deadline. A unit can only be assigned
 * once per class — a duplicate is a Turkish error, not a crash.
 */
export async function createAssignment(classId: string, unitId: string, sonTarih: string): Promise<AssignmentDoc | null> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return null;
  try {
    const { data, error } = await sb
      .from('assignments')
      .insert({ class_id: classId, unit_id: unitId, son_tarih: sonTarih })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('Bu ünite için zaten bir ödev var.');
      }
      throw toTurkishError(error);
    }
    return toAssignmentDoc(data as Record<string, unknown>);
  } catch (e) {
    throw toTurkishError(e);
  }
}

/** Moves an assignment's deadline ('YYYY-MM-DD'). */
export async function updateAssignment(assignmentId: string, sonTarih: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('assignments').update({ son_tarih: sonTarih }).eq('id', assignmentId);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

export async function deleteAssignment(assignmentId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('assignments').delete().eq('id', assignmentId);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

// ---------------------------------------------------------------------------
// Announcements (teacher writes/deletes, members read; 0003 — no editing:
// a correction is delete + new)
// ---------------------------------------------------------------------------

function toAnnouncementDoc(row: Record<string, unknown>): AnnouncementDoc {
  return {
    id: String(row.id),
    classId: String(row.class_id),
    metin: String(row.metin ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

/** The announcements of a class (member or owner), newest first, capped at `limit`. */
export async function listAnnouncements(classId: string, limit = 50): Promise<AnnouncementDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('class_announcements')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map(toAnnouncementDoc);
  } catch {
    return [];
  }
}

/**
 * Posts a one-way class announcement (1–500 chars after trimming). An empty or
 * over-long text never leaves the client; both are Turkish errors, matching
 * the schema's btrim length check.
 */
export async function postAnnouncement(classId: string, metin: string): Promise<AnnouncementDoc | null> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return null;
  const text = metin.trim();
  if (text.length < 1) throw new Error('Duyuru boş olamaz.');
  if (text.length > 500) throw new Error('Duyuru en çok 500 karakter olabilir.');
  try {
    const { data, error } = await sb
      .from('class_announcements')
      .insert({ class_id: classId, metin: text })
      .select('*')
      .single();
    if (error) throw toTurkishError(error);
    return toAnnouncementDoc(data as Record<string, unknown>);
  } catch (e) {
    throw toTurkishError(e);
  }
}

/** Deletes an announcement of a class the caller owns. */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const { error } = await sb.from('class_announcements').delete().eq('id', id);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}

// ---------------------------------------------------------------------------
// Teacher summary RPCs (p_week_start = local Monday 00:00, see week.ts)
// ---------------------------------------------------------------------------

/** Per-member weekly/total XP, streak and completed lessons (teacher only). */
export async function classProgress(classId: string): Promise<ProgressRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc('class_progress', {
      p_class: classId,
      p_week_start: localWeekStartIso(),
    });
    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      userId: String(row.user_id),
      takmaAd: String(row.takma_ad),
      joinedAt: String(row.joined_at ?? ''),
      weeklyXp: Number(row.weekly_xp ?? 0),
      totalXp: Number(row.total_xp ?? 0),
      streak: Number(row.streak ?? 0),
      lastActiveDate: (row.last_active_date as string | null) ?? null,
      completedLessons: (row.completed_lessons as string[] | null) ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * Where the class struggles: per-lesson attempt counts, accuracy and merged
 * mistakes_by_type since `sinceIso` (an ISO timestamp, e.g. one week back).
 */
export async function classStruggles(classId: string, sinceIso: string): Promise<StruggleRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc('class_struggles', { p_class: classId, p_since: sinceIso });
    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      lessonId: String(row.lesson_id),
      attempts: Number(row.attempts ?? 0),
      correct: Number(row.correct ?? 0),
      total: Number(row.total ?? 0),
      mistakesByType: (row.mistakes_by_type as Record<string, number> | null) ?? {},
    }));
  } catch {
    return [];
  }
}

/** Class-internal weekly league (members and the teacher; nicknames only). */
export async function classLeague(classId: string): Promise<LeagueRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc('class_league', {
      p_class: classId,
      p_week_start: localWeekStartIso(),
    });
    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      takmaAd: String(row.takma_ad),
      weeklyXp: Number(row.weekly_xp ?? 0),
      isMe: row.is_me === true,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

/** Maps join_class RPC failures to the Turkish messages the join screen shows. */
function toJoinError(e: unknown): Error {
  const message =
    typeof e === 'object' && e && 'message' in e
      ? String((e as { message: unknown }).message)
      : e instanceof Error
        ? e.message
        : String(e);
  const code =
    typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (/too_many_attempts/.test(message)) {
    return new Error('Çok fazla hatalı deneme. Bir saat sonra tekrar dene.');
  }
  if (/own_class/.test(message)) {
    return new Error('Kendi sınıfına öğrenci olarak katılamazsın.');
  }
  if (code === '23505') {
    return new Error('Bu takma ad sınıfta kullanılıyor.');
  }
  if (code === '23514' || /takma_ad/.test(message)) {
    return new Error('Takma ad 3–20 karakter olmalı (harf, rakam, boşluk, . _ -).');
  }
  return toTurkishError(e);
}

/**
 * Joins a class by its 6-char code with a class nickname. When there is no
 * session at all, an anonymous GoTrue account is created first (students
 * never enter an e-mail). Success resolves to the joined class; the failures
 * resolve as Turkish Errors ('Bilinmeyen sınıf kodu.', throttle, own class,
 * nickname taken/invalid) so the join screen can show them inline.
 */
export async function joinAsStudent(code: string, takmaAd: string): Promise<JoinedClass | null> {
  const sb = getSupabase();
  if (!sb) return null;
  let { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) throw toTurkishError(error);
    sessionData = (await sb.auth.getSession()).data;
    if (!sessionData.session) {
      throw new Error('Oturum açılamadı. Lütfen tekrar dene.');
    }
  }
  let result: { data: unknown; error: unknown };
  try {
    result = await sb.rpc('join_class', { p_code: code, p_takma_ad: takmaAd.trim() });
  } catch (e) {
    throw toJoinError(e);
  }
  if (result.error) throw toJoinError(result.error);
  const row = (result.data as { class_id: string; ad: string; course_id: string }[] | null)?.[0];
  if (!row) throw new Error('Bilinmeyen sınıf kodu.');
  return { classId: row.class_id, ad: row.ad, courseId: row.course_id as CourseId };
}

/** The caller's classes as a student (archived classes are excluded server-side). */
export async function myClasses(): Promise<MyClassDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc('my_classes');
    if (error) return [];
    return (
      (data as { class_id: string; ad: string; course_id: string; takma_ad: string; joined_at: string }[] | null) ?? []
    ).map((row) => ({
      classId: row.class_id,
      ad: row.ad,
      courseId: row.course_id as CourseId,
      takmaAd: row.takma_ad,
      joinedAt: row.joined_at,
    }));
  } catch {
    return [];
  }
}

/** Leaves (and deletes) the caller's own membership of a class. */
export async function leaveClass(classId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !(await hasSession(sb))) return false;
  try {
    const uid = await currentUid(sb);
    if (!uid) return false;
    const { error } = await sb.from('class_members').delete().eq('class_id', classId).eq('user_id', uid);
    if (error) throw toTurkishError(error);
    return true;
  } catch (e) {
    throw toTurkishError(e);
  }
}
