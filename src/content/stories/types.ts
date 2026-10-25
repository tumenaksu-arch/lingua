/**
 * End-of-unit stories / dialogues (roadmap item 2). One story per unit, kept apart from the
 * course files so released lessons never change. Keyed by unit id ('tr-en.u1', ...).
 * Story ids are '<unitId>.story' and are stored as progress rows like lessons (they never
 * gate the learning path).
 */
export interface StoryCharacter {
  name: string;
  /** used to pick a voice later (roadmap item 7); optional */
  gender?: 'f' | 'm';
}

export interface StoryLine {
  /** must be one of the story's character names */
  speaker: string;
  /** line in the target language */
  text: string;
  /** natural Turkish translation (shown on tap) */
  tr: string;
}

export interface StoryQuestion {
  /** comprehension question in Turkish */
  prompt: string;
  /** 3 options (Turkish or target language), exactly one correct */
  options: string[];
  correctIndex: number;
  /** short Turkish explanation shown after answering */
  explanation: string;
}

export interface Story {
  id: string;
  unitId: string;
  /** Turkish title */
  title: string;
  /** one Turkish sentence that sets the scene */
  setting: string;
  characters: StoryCharacter[];
  /** 8–14 lines */
  lines: StoryLine[];
  /** 3–4 questions */
  questions: StoryQuestion[];
}

export type CourseStories = Record<string, Story>;
