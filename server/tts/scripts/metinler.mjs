#!/usr/bin/env node
/**
 * metinler.mjs — extracts every target-language text the app can speak from
 * src/content and writes server/tts/metinler.json ([{ lang, text }], deduplicated,
 * ≤ 300 chars). Run from the repo root:
 *
 *   node server/tts/scripts/metinler.mjs
 *
 * The actual extraction runs in TypeScript via `npx tsx` (not a repo dependency,
 * fetched on first use by npx).
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const ttsDir = dirname(scriptsDir);
const repoRoot = join(ttsDir, '..', '..');
const extractTs = join(scriptsDir, 'metinler.extract.ts');
const outFile = join(ttsDir, 'metinler.json');

console.error('extracting speakable texts via npx tsx ...');
const raw = execFileSync('npx', ['--yes', 'tsx', extractTs], {
  cwd: repoRoot,
  maxBuffer: 64 * 1024 * 1024,
  encoding: 'utf8',
});

const items = JSON.parse(raw);
const counts = {};
for (const item of items) counts[item.lang] = (counts[item.lang] ?? 0) + 1;

writeFileSync(outFile, JSON.stringify(items, null, 1) + '\n');

console.log(`wrote ${outFile}`);
console.log(`total: ${items.length}`);
for (const lang of Object.keys(counts).sort()) {
  console.log(`  ${lang}: ${counts[lang]}`);
}
if (items.length <= 2000) {
  console.error('WARN: expected more than 2000 items');
  process.exitCode = 1;
}
