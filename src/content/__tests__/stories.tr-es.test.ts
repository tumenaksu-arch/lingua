import { getCourse } from '..';
import { trEsStories } from '../stories/tr-es';

const course = getCourse('tr-es');

describe('tr-es stories', () => {
  it('has exactly one story per unit, keyed and referenced by unit id', () => {
    expect(course).toBeDefined();
    const unitIds = course!.units.map((u) => u.id).sort();
    expect(Object.keys(trEsStories).sort()).toEqual(unitIds);
    for (const unitId of unitIds) {
      const story = trEsStories[unitId];
      expect(story.id).toBe(`${unitId}.story`);
      expect(story.unitId).toBe(unitId);
    }
  });

  it('has 8–14 lines, every speaker declared, all strings non-empty', () => {
    for (const [unitId, story] of Object.entries(trEsStories)) {
      expect(story.lines.length).toBeGreaterThanOrEqual(8);
      expect(story.lines.length).toBeLessThanOrEqual(14);
      const names = new Set(story.characters.map((c) => c.name));
      expect(names.size).toBe(story.characters.length);
      expect(story.characters.length).toBeGreaterThanOrEqual(2);
      for (const c of story.characters) {
        expect(c.name.trim().length).toBeGreaterThan(0);
      }
      for (const line of story.lines) {
        if (!names.has(line.speaker)) throw new Error(`${unitId}: undeclared speaker ${line.speaker}`);
        expect(line.text.trim().length).toBeGreaterThan(0);
        expect(line.tr.trim().length).toBeGreaterThan(0);
      }
      expect(story.title.trim().length).toBeGreaterThan(0);
      expect(story.setting.trim().length).toBeGreaterThan(0);
    }
  });

  it('has 3–4 questions with 3 distinct options and a valid correctIndex', () => {
    for (const story of Object.values(trEsStories)) {
      expect(story.questions.length).toBeGreaterThanOrEqual(3);
      expect(story.questions.length).toBeLessThanOrEqual(4);
      for (const q of story.questions) {
        expect(q.prompt.trim().length).toBeGreaterThan(0);
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        for (const o of q.options) {
          expect(o.trim().length).toBeGreaterThan(0);
        }
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(3);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
