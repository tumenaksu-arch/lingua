#!/usr/bin/env node
/**
 * Builds a signed release APK of the Lingua web shell.
 *
 *   npm run release -- 0.1.1
 *
 * Steps (same chain as the EduPilot shell, ankaokul scripts/release-mobile.mjs):
 * versionName = <version>, versionCode + 1 → cap sync → gradle assembleRelease →
 * zipalign → apksigner → dist/Love-Vox-<version>.apk (+ .sha256).
 *
 * Environment:
 *   ANDROID_HOME   Android SDK (default ~/android-sdk), needs build-tools 35.0.0
 *   JAVA_HOME      JDK 17+ (default ~/android-tools/jdk)
 *   LINGUA_KEYSTORE / LINGUA_KEYSTORE_PASS
 *                  default ~/ankaokul-secrets/lingua-mobile.keystore and the
 *                  LINGUA_KEYSTORE_PASS line of its .README next to it (alias lingua-mobile).
 * The keystore is the app's identity: losing it means installed apps can never be updated.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Kullanım: npm run release -- <x.y.z>');
  process.exit(1);
}

const home = homedir();
const androidHome = process.env.ANDROID_HOME ?? join(home, 'android-sdk');
const javaHome = process.env.JAVA_HOME ?? join(home, 'android-tools', 'jdk');
const buildTools = join(androidHome, 'build-tools', '35.0.0');
const keystore = process.env.LINGUA_KEYSTORE ?? join(home, 'ankaokul-secrets', 'lingua-mobile.keystore');
let pass = process.env.LINGUA_KEYSTORE_PASS;
if (!pass && existsSync(`${keystore}.README`)) {
  pass = /^LINGUA_KEYSTORE_PASS=(.+)$/m.exec(readFileSync(`${keystore}.README`, 'utf8'))?.[1]?.trim();
}
for (const [what, path] of [['Android SDK build-tools 35.0.0', buildTools], ['JDK', javaHome], ['keystore', keystore]]) {
  if (!existsSync(path)) {
    console.error(`✋ ${what} bulunamadı: ${path}`);
    process.exit(1);
  }
}
if (!pass) {
  console.error('✋ LINGUA_KEYSTORE_PASS yok (ortam değişkeni ya da keystore README).');
  process.exit(1);
}

const env = { ...process.env, ANDROID_HOME: androidHome, JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')}:${process.env.PATH}` };
const run = (cmd, args, cwd = root, extra = {}) => execFileSync(cmd, args, { cwd, env: { ...env, ...extra }, stdio: 'inherit' });

// 1) Version: versionName = version, versionCode + 1 (restored if the build fails).
const gradlePath = join(root, 'android', 'app', 'build.gradle');
const originalGradle = readFileSync(gradlePath, 'utf8');
const code = Number(/versionCode (\d+)/.exec(originalGradle)?.[1]);
if (!Number.isInteger(code)) throw new Error('versionCode bulunamadı');
writeFileSync(
  gradlePath,
  originalGradle.replace(/versionCode \d+/, `versionCode ${code + 1}`).replace(/versionName "[^"]*"/, `versionName "${version}"`),
);

try {
  // 2) Sync config + plugins, 3) build.
  run('npx', ['cap', 'sync', 'android']);
  run('./gradlew', ['assembleRelease', '-q'], join(root, 'android'));

  // 4) Align + sign (the password reaches apksigner through the environment, never argv).
  const unsigned = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  const aligned = join(dist, `Love-Vox-${version}-aligned.apk`);
  const out = join(dist, `Love-Vox-${version}.apk`);
  run(join(buildTools, 'zipalign'), ['-f', '4', unsigned, aligned]);
  run(
    join(buildTools, 'apksigner'),
    ['sign', '--ks', keystore, '--ks-key-alias', 'lingua-mobile', '--ks-pass', 'env:LINGUA_KEYSTORE_PASS', '--key-pass', 'env:LINGUA_KEYSTORE_PASS', '--out', out, aligned],
    root,
    { LINGUA_KEYSTORE_PASS: pass },
  );
  run(join(buildTools, 'apksigner'), ['verify', out]);
  const sha = createHash('sha256').update(readFileSync(out)).digest('hex');
  writeFileSync(`${out}.sha256`, `${sha}  Love-Vox-${version}.apk\n`);
  console.log(`✅ ${out}\n   versionName ${version} · versionCode ${code + 1} · sha256 ${sha}`);
} catch (e) {
  writeFileSync(gradlePath, originalGradle);
  console.error('✋ Derleme başarısız; build.gradle eski haline döndürüldü.');
  throw e;
}
