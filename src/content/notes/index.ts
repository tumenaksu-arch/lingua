import { trDeNotes } from './tr-de';
import { trEnNotes } from './tr-en';
import { trEsNotes } from './tr-es';
import { trFrNotes } from './tr-fr';
import { trItNotes } from './tr-it';
import type { UnitNote } from './types';

/**
 * Lookup for roadmap item 1 (unit grammar notes). Every course keys its notes by the
 * owning unit id ('tr-en.u1', ...), so a flat merge is enough and ids never collide.
 */
const BY_UNIT: Record<string, UnitNote> = {
  ...trEnNotes,
  ...trDeNotes,
  ...trEsNotes,
  ...trFrNotes,
  ...trItNotes,
};

export function getUnitNote(unitId: string): UnitNote | undefined {
  return BY_UNIT[unitId];
}

export type { CourseNotes, NoteExample, NoteSection, UnitNote } from './types';
