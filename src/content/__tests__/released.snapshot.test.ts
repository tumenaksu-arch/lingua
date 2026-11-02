import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { courses } from '..';

/**
 * Generator for `fixtures/released-v<N>.json` — the "content only grows" lock read by released.test.ts.
 * Skipped in normal runs; the coordinator runs it ON PURPOSE right before a release that adds content:
 *
 *   RELEASED_SNAPSHOT=v3 npx jest src/content/__tests__/released.snapshot.test.ts
 *
 * then adds the new file to the `snapshots` list in released.test.ts. Older files are never deleted or edited.
 */
const tag = process.env.RELEASED_SNAPSHOT;

(tag ? test : test.skip)(`writes fixtures/released-${tag ?? 'vN'}.json`, () => {
  const snap = courses.map((c) => ({
    id: c.id,
    vocab: c.vocab.map((v) => ({ id: v.id, term: v.term, translation: v.translation })),
    units: c.units.map((u) => ({
      id: u.id,
      order: u.order,
      lessons: u.lessons.map((l) => ({ id: l.id, order: l.order, vocabIds: l.vocabIds, exercises: l.exercises })),
    })),
  }));
  const dir = join(__dirname, 'fixtures');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `released-${tag}.json`);
  writeFileSync(file, JSON.stringify(snap));
  expect(snap.length).toBeGreaterThan(0);
});
