import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';

import type { OutboxTable } from '../local/outbox';
import { AuthRequiredError, type RemoteApi } from '../sync/syncService';
import { getFirestoreDb } from './firebase';

/**
 * Firestore layout (all under the signed-in user's document; see firestore.rules):
 *   users/{uid}/stats/current
 *   users/{uid}/progress/{lessonId}
 *   users/{uid}/srs/{vocabId}
 *   users/{uid}/events/{eventId}
 * Row shapes are the snake_case "server rows" produced by the repos, with
 * `updated_at` as an ISO string so range queries sort lexicographically.
 */
const SUBCOLLECTION: Record<OutboxTable, string> = {
  user_stats: 'stats',
  user_progress: 'progress',
  srs_cards: 'srs',
  events: 'events',
};

export function docIdFor(table: OutboxTable, row: Record<string, unknown>): string {
  switch (table) {
    case 'user_stats':
      return 'current';
    case 'user_progress':
      return String(row.lesson_id);
    case 'srs_cards':
      return String(row.vocab_id);
    case 'events':
      return String(row.id);
  }
}

const MAX_BATCH = 500;

function isAuthError(e: unknown): boolean {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  return code === 'permission-denied' || code === 'unauthenticated';
}

export function firestoreRemote(): RemoteApi | null {
  const db = getFirestoreDb();
  if (!db) return null;
  return {
    async upsert(table, rows) {
      try {
        for (let i = 0; i < rows.length; i += MAX_BATCH) {
          const batch = writeBatch(db);
          for (const row of rows.slice(i, i + MAX_BATCH)) {
            const uid = String(row.user_id);
            batch.set(doc(db, 'users', uid, SUBCOLLECTION[table], docIdFor(table, row)), row, { merge: true });
          }
          await batch.commit();
        }
      } catch (e) {
        if (isAuthError(e)) throw new AuthRequiredError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    async pull(table, userId, sinceIso) {
      try {
        const q = query(collection(db, 'users', userId, SUBCOLLECTION[table]), where('updated_at', '>', sinceIso));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data());
      } catch (e) {
        if (isAuthError(e)) throw new AuthRequiredError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
  };
}
