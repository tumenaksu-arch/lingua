import { getCourse } from '..';
import { trDeStories } from '../stories/tr-de';

const course = getCourse('tr-de');

describe('tr-de stories (one per unit)', () => {
  it('course exists', () => {
    expect(course).toBeDefined();
  });

  it('every unit has exactly one story and there are no extra stories', () => {
    expect(course).toBeDefined();
    const unitIds = course!.units.map((u) => u.id);
    expect(unitIds.length).toBeGreaterThan(0);
    expect(Object.keys(trDeStories).sort()).toEqual([...unitIds].sort());
  });

  it('each story has matching id/unitId, Turkish title/setting and 2–3 characters', () => {
    for (const unit of course!.units) {
      const story = trDeStories[unit.id];
      expect(story).toBeDefined();
      if (!story) continue;
      expect(story.id).toBe(`${unit.id}.story`);
      expect(story.unitId).toBe(unit.id);
      expect(story.title.trim().length).toBeGreaterThan(0);
      expect(story.setting.trim().length).toBeGreaterThan(0);
      expect(story.characters.length).toBeGreaterThanOrEqual(2);
      expect(story.characters.length).toBeLessThanOrEqual(3);
      const names = story.characters.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
      for (const c of story.characters) {
        expect(c.name.trim().length).toBeGreaterThan(0);
        expect(c.gender === undefined || c.gender === 'f' || c.gender === 'm').toBe(true);
      }
    }
  });

  it('each story has 8–14 lines, all speakers declared, all strings non-empty', () => {
    for (const unit of course!.units) {
      const story = trDeStories[unit.id];
      if (!story) continue;
      expect(story.lines.length).toBeGreaterThanOrEqual(8);
      expect(story.lines.length).toBeLessThanOrEqual(14);
      const names = new Set(story.characters.map((c) => c.name));
      for (const line of story.lines) {
        expect(names.has(line.speaker)).toBe(true);
        expect(line.text.trim().length).toBeGreaterThan(0);
        expect(line.tr.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('each story has 3–4 questions with 3 distinct options and correctIndex in range', () => {
    for (const unit of course!.units) {
      const story = trDeStories[unit.id];
      if (!story) continue;
      expect(story.questions.length).toBeGreaterThanOrEqual(3);
      expect(story.questions.length).toBeLessThanOrEqual(4);
      for (const q of story.questions) {
        expect(q.prompt.trim().length).toBeGreaterThan(0);
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        for (const option of q.options) {
          expect(option.trim().length).toBeGreaterThan(0);
        }
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(2);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
