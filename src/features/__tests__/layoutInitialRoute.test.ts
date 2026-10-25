import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Expo Router opens the FIRST registered Stack screen on launch. A modal registered before the
 * guarded groups (sinif-katil did) replaced the welcome screen for every visitor.
 */
describe('root layout screen order', () => {
  const src = readFileSync(join(__dirname, '../../app/_layout.tsx'), 'utf8');
  const screens = [...src.matchAll(/<Stack\.(Screen|Protected)\b[^>]*?(?:name="([^"]+)")?/g)].map((m) => m[2] ?? m[1]);

  it('starts with a guarded group, never with a standalone screen', () => {
    expect(screens[0]).toBe('Protected');
  });

  it('registers unguarded modals only after all guarded groups', () => {
    const lastProtected = src.lastIndexOf('</Stack.Protected>');
    expect(src.indexOf('name="sinif-katil"')).toBeGreaterThan(lastProtected);
  });
});
