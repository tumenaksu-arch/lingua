import { trDeStories } from './tr-de';
import { trEnStories } from './tr-en';
import { trEsStories } from './tr-es';
import { trFrStories } from './tr-fr';
import { trItStories } from './tr-it';
import type { Story } from './types';

/**
 * Lookup for roadmap item 2 (end-of-unit stories). Every course keys its stories
 * by the owning unit id ('tr-en.u1', ...), so a flat merge is enough and ids never
 * collide. Story ids are '<unitId>.story' and are stored as progress rows like
 * lessons, but they are not in lessonOrder so they never gate the learning path.
 */
const BY_UNIT: Record<string, Story> = {
  ...trEnStories,
  ...trDeStories,
  ...trEsStories,
  ...trFrStories,
  ...trItStories,
};

export function getUnitStory(unitId: string): Story | undefined {
  return BY_UNIT[unitId];
}

export type { CourseStories, Story, StoryCharacter, StoryLine, StoryQuestion } from './types';
