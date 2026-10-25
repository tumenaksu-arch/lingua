import { getCourse } from '..';
import { trEnStories } from '../stories/tr-en';

const course = getCourse('tr-en')!;

describe('tr-en unit stories', () => {
  test('every unit has a story with matching id and unitId', () => {
    for (const u of course.units) {
      const story = trEnStories[u.id];
      expect({ unit: u.id, story: !!story }).toEqual({ unit: u.id, story: true });
      expect(story.id).toBe(`${u.id}.story`);
      expect(story.unitId).toBe(u.id);
    }
  });

  test('there are no stories for units that do not exist', () => {
    const unitIds = new Set(course.units.map((u) => u.id));
    for (const key of Object.keys(trEnStories)) expect(unitIds.has(key)).toBe(true);
  });

  test('each story has 2–3 characters and 8–14 lines from declared characters', () => {
    for (const story of Object.values(trEnStories)) {
      expect(story.characters.length).toBeGreaterThanOrEqual(2);
      expect(story.characters.length).toBeLessThanOrEqual(3);
      expect(story.lines.length).toBeGreaterThanOrEqual(8);
      expect(story.lines.length).toBeLessThanOrEqual(14);
      const names = new Set(story.characters.map((c) => c.name));
      for (const line of story.lines) {
        expect({ story: story.id, speaker: line.speaker, ok: names.has(line.speaker) }).toEqual({
          story: story.id,
          speaker: line.speaker,
          ok: true,
        });
      }
    }
  });

  test('each story has 3–4 questions with 3 distinct options and correctIndex in range', () => {
    for (const story of Object.values(trEnStories)) {
      expect(story.questions.length).toBeGreaterThanOrEqual(3);
      expect(story.questions.length).toBeLessThanOrEqual(4);
      for (const q of story.questions) {
        expect(q.options.length).toBe(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(3);
      }
    }
  });

  test('all story strings are non-empty', () => {
    for (const story of Object.values(trEnStories)) {
      expect(story.title.trim().length).toBeGreaterThan(0);
      expect(story.setting.trim().length).toBeGreaterThan(0);
      for (const c of story.characters) expect(c.name.trim().length).toBeGreaterThan(0);
      for (const line of story.lines) {
        expect(line.text.trim().length).toBeGreaterThan(0);
        expect(line.tr.trim().length).toBeGreaterThan(0);
      }
      for (const q of story.questions) {
        expect(q.prompt.trim().length).toBeGreaterThan(0);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
        for (const opt of q.options) expect(opt.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
