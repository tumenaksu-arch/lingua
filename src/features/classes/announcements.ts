import { getSupabase } from '@/data/remote/supabase';

/**
 * One-way class announcements (madde 5, migration 0003): the teacher writes,
 * class members read. Deliberately read-only on the student side — no reply or
 * messaging UI anywhere (most students are minors; 1:1 messaging is a
 * KVKK / child-safety risk by design decision 2026-10-26).
 */

export interface AnnouncementDoc {
  id: string;
  metin: string;
  createdAt: string;
}

/**
 * The newest `limit` announcements of a class the caller belongs to, newest
 * first. Degrades to [] when Supabase is not configured or RLS rejects.
 */
export async function listAnnouncements(classId: string, limit = 20): Promise<AnnouncementDoc[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('class_announcements')
      .select('id, metin, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      metin: String(row.metin),
      createdAt: String(row.created_at ?? ''),
    }));
  } catch {
    return [];
  }
}
