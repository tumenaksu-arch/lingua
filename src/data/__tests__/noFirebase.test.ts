import * as fs from 'fs';
import * as path from 'path';

/**
 * Firebase is gone from the app: no file under src may import the firebase package
 * (or the deleted remote/firebase / remote/firestoreRemote modules) anymore.
 * The scan covers ALL of src — only the legacy AsyncStorage key string
 * 'firebase:authUser:' may remain (in src/data/remote/legacy.ts, used to detect
 * leftover sessions), and it matches no import/require pattern below.
 */
const SRC = path.join(__dirname, '..', '..');

const IMPORT_RE = /from\s+['"]([^'"]*(?:firebase|firestoreRemote)[^'"]*)['"]/i;
const REQUIRE_RE = /require\(\s*['"]([^'"]*firebase[^'"]*)['"]\s*\)/i;

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) yield full;
  }
}

describe('no firebase imports in src', () => {
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(path.join(SRC, '..'), file);
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const m = IMPORT_RE.exec(line) ?? REQUIRE_RE.exec(line);
      if (m && !/^\s*(\*|\/\/)/.test(line)) offenders.push(`${rel}: ${line.trim()}`);
    }
  }

  it('src contains no firebase/firestoreRemote imports', () => {
    expect(offenders).toEqual([]);
  });
});
