import type { Exercise } from '@/domain/types';

import { courses } from '..';
import { getExplanation, genericHint } from '../explanations';
import { getUnitNote } from '../notes';

describe('getUnitNote', () => {
  it('returns the note for a known unit id', () => {
    const note = getUnitNote('tr-en.u1');
    expect(note).toBeDefined();
    expect(note!.unitId).toBe('tr-en.u1');
    expect(note!.title.length).toBeGreaterThan(0);
    expect(note!.sections.length).toBeGreaterThanOrEqual(2);
  });

  it('returns undefined for an unknown unit id', () => {
    expect(getUnitNote('tr-en.u999')).toBeUndefined();
    expect(getUnitNote('no-such-unit')).toBeUndefined();
  });

  it('covers every unit of every bundled course', () => {
    for (const course of courses) {
      for (const unit of course.units) {
        const note = getUnitNote(unit.id);
        expect({ unit: unit.id, ok: !!note }).toEqual({ unit: unit.id, ok: true });
      }
    }
  });
});

describe('getExplanation', () => {
  it('returns the explanation text for a known exercise id', () => {
    const text = getExplanation('tr-en.u1.l1.e1');
    expect(typeof text).toBe('string');
    expect(text!.length).toBeGreaterThan(10);
  });

  it('returns undefined for an unknown exercise id', () => {
    expect(getExplanation('tr-en.u9.l9.e99')).toBeUndefined();
  });
});

describe('genericHint', () => {
  const ALL_TYPES: Exercise['type'][] = [
    'select_translation',
    'fill_blank',
    'translate_build',
    'listen_type',
    'speak',
    'match_pairs',
  ];

  it('covers all six exercise types with a non-empty Turkish hint', () => {
    for (const type of ALL_TYPES) {
      const hint = genericHint(type);
      expect(typeof hint).toBe('string');
      expect(hint.length).toBeGreaterThan(10);
    }
  });

  it('mentions the slow-listen button for listen_type', () => {
    expect(genericHint('listen_type')).toContain('Yavaş dinle');
  });
});
