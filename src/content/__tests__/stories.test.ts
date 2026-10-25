import type { Story } from '../stories/types';
import { getUnitStory } from '../stories';
import { courses } from '..';

// The real story content ships in the course files (written by the content worker);
// inject a fixture through the tr-en module to test the lookup in isolation.
jest.mock('../stories/tr-en', () => {
  const mockStory: Story = {
    id: 'tr-en.u1.story',
    unitId: 'tr-en.u1',
    title: 'Kahvede tanışma',
    setting: 'Bir kafede iki yabancı sohbet ediyor.',
    characters: [
      { name: 'Anna', gender: 'f' },
      { name: 'Mark', gender: 'm' },
    ],
    lines: [
      { speaker: 'Anna', text: 'Hello!', tr: 'Merhaba!' },
      { speaker: 'Mark', text: 'Hi, how are you?', tr: 'Selam, nasılsın?' },
    ],
    questions: [
      { prompt: 'Anna ne dedi?', options: ['Merhaba!', 'Hoşça kal!'], correctIndex: 0, explanation: 'Anna “Hello!” dedi.' },
    ],
  };
  return { trEnStories: { 'tr-en.u1': mockStory } };
});

describe('getUnitStory', () => {
  it('returns the story for a unit that has one', () => {
    const story = getUnitStory('tr-en.u1');
    expect(story).toBeDefined();
    expect(story!.id).toBe('tr-en.u1.story');
    expect(story!.title).toBe('Kahvede tanışma');
  });

  it('returns undefined for an unknown unit', () => {
    expect(getUnitStory('tr-en.u99')).toBeUndefined();
  });

  it('finds the shipped story of every unit of the other courses', () => {
    for (const course of courses.filter((c) => c.id !== 'tr-en')) {
      for (const unit of course.units) {
        expect(getUnitStory(unit.id)?.id).toBe(`${unit.id}.story`);
      }
    }
  });
});
