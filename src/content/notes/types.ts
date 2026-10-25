/**
 * Per-unit grammar notes for Turkish speakers (roadmap item 1). Kept apart from the course
 * files so released course content never changes. Keyed by unit id ('tr-en.u1', ...).
 */
export interface NoteExample {
  /** sentence in the target language */
  target: string;
  /** natural Turkish translation */
  tr: string;
}

export interface NoteSection {
  heading: string;
  /** 1–4 short Turkish paragraphs; plain text, no markdown */
  body: string[];
  examples?: NoteExample[];
}

export interface UnitNote {
  unitId: string;
  title: string;
  sections: NoteSection[];
}

export type CourseNotes = Record<string, UnitNote>;
