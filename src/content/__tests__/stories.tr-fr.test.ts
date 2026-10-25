import { getCourse } from '..';
import { trFrStories } from '../stories/tr-fr';

describe('tr-fr stories', () => {
  const course = getCourse('tr-fr');
  if (!course) throw new Error('course tr-fr not found');

  test('every unit has a story with matching id and unitId', () => {
    for (const u of course.units) {
      const story = trFrStories[u.id];
      expect(story).toBeDefined();
      expect(story.id).toBe(`${u.id}.story`);
      expect(story.unitId).toBe(u.id);
    }
  });

  test('every story has 2–3 declared characters and 8–14 lines with declared speakers', () => {
    for (const story of Object.values(trFrStories)) {
      expect(story.characters.length).toBeGreaterThanOrEqual(2);
      expect(story.characters.length).toBeLessThanOrEqual(3);
      const names = new Set(story.characters.map((c) => c.name));
      expect(story.lines.length).toBeGreaterThanOrEqual(8);
      expect(story.lines.length).toBeLessThanOrEqual(14);
      for (const line of story.lines) {
        expect(names.has(line.speaker)).toBe(true);
      }
    }
  });

  test('every story has 3–4 questions with 3 distinct options and correctIndex in range', () => {
    for (const story of Object.values(trFrStories)) {
      expect(story.questions.length).toBeGreaterThanOrEqual(3);
      expect(story.questions.length).toBeLessThanOrEqual(4);
      for (const q of story.questions) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
      }
    }
  });

  test('all strings in stories are non-empty', () => {
    for (const story of Object.values(trFrStories)) {
      expect(story.title.trim().length).toBeGreaterThan(0);
      expect(story.setting.trim().length).toBeGreaterThan(0);
      for (const c of story.characters) {
        expect(c.name.trim().length).toBeGreaterThan(0);
      }
      for (const line of story.lines) {
        expect(line.text.trim().length).toBeGreaterThan(0);
        expect(line.tr.trim().length).toBeGreaterThan(0);
      }
      for (const q of story.questions) {
        expect(q.prompt.trim().length).toBeGreaterThan(0);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
        for (const option of q.options) {
          expect(option.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
