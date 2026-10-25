import { getCourse } from '..';
import { trItStories } from '../stories/tr-it';

const course = getCourse('tr-it');
if (!course) throw new Error("course 'tr-it' not found");

const expectNonEmpty = (s: string) => expect(s.trim().length).toBeGreaterThan(0);

describe('tr-it stories', () => {
  test('every unit has a story with matching key, id and unitId', () => {
    expect(Object.keys(trItStories).sort()).toEqual(course.units.map((u) => u.id).sort());
    for (const unit of course.units) {
      const story = trItStories[unit.id];
      if (!story) throw new Error(`missing story for ${unit.id}`);
      expect(story.unitId).toBe(unit.id);
      expect(story.id).toBe(`${unit.id}.story`);
      expectNonEmpty(story.title);
      expectNonEmpty(story.setting);
    }
  });

  test('characters: 2–3 declared, 8–14 lines, every speaker declared', () => {
    for (const [unitId, story] of Object.entries(trItStories)) {
      expect(story.characters.length).toBeGreaterThanOrEqual(2);
      expect(story.characters.length).toBeLessThanOrEqual(3);
      for (const character of story.characters) expectNonEmpty(character.name);
      const names = new Set(story.characters.map((c) => c.name));
      expect(story.lines.length).toBeGreaterThanOrEqual(8);
      expect(story.lines.length).toBeLessThanOrEqual(14);
      for (const line of story.lines) {
        if (!names.has(line.speaker)) throw new Error(`${unitId}: undeclared speaker ${line.speaker}`);
        expectNonEmpty(line.text);
        expectNonEmpty(line.tr);
      }
    }
  });

  test('questions: 3–4, 3 distinct non-empty options, correctIndex in range', () => {
    for (const story of Object.values(trItStories)) {
      expect(story.questions.length).toBeGreaterThanOrEqual(3);
      expect(story.questions.length).toBeLessThanOrEqual(4);
      for (const question of story.questions) {
        expectNonEmpty(question.prompt);
        expect(question.options).toHaveLength(3);
        for (const option of question.options) expectNonEmpty(option);
        expect(new Set(question.options).size).toBe(3);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(3);
        expectNonEmpty(question.explanation);
      }
    }
  });
});
