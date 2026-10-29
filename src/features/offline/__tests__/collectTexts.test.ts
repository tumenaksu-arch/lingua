import { course, lesson, listen, sel, speak, unit } from '@/content/builder';
import type { Story } from '@/content/stories';
import type { Course } from '@/domain/types';

import { collectCourseTexts } from '../collectTexts';

const c = course(
  { id: 't-en', fromLang: 'tr', toLang: 'en', title: 'Test' },
  [['a', 'apple', 'elma']],
  [
    unit('t-en.u1', 1, 'U1', 'tanım', [
      lesson('t-en.u1.l1', 1, ['a'], [
        listen('Hello there.'),
        listen('Hello there.'), // bilinçli tekrar — tekilleşmeli
        listen('   '), // boş metin — atılmalı
        speak('How are you?'),
        sel('elma', ['apple'], 0), // seslendirilmez
      ]),
    ]),
    unit('t-en.u2', 2, 'U2', 'tanım', [lesson('t-en.u2.l1', 1, [], [listen('See you soon.')])]),
  ],
);

const story: Story = {
  id: 't-en.u1.story',
  unitId: 't-en.u1',
  title: 'Hikâye',
  setting: 'Sahne',
  characters: [{ name: 'Ada' }],
  lines: [
    { speaker: 'Ada', text: 'Good evening.', tr: 'İyi akşamlar.' },
    { speaker: 'Ada', text: '', tr: 'boş satır' },
  ],
  questions: [],
};

describe('collectCourseTexts', () => {
  test('listen/speak metinlerini ve hikâye satırlarını toplar; tekrarları tekilleştirir', () => {
    const texts = collectCourseTexts(c, () => story);
    expect(texts).toEqual([
      { text: 'Hello there.', lang: 'en' },
      { text: 'How are you?', lang: 'en' },
      { text: 'Good evening.', lang: 'en' },
      { text: 'See you soon.', lang: 'en' },
    ]);
  });

  test('boş ve beyaz-boşluk metinler listede yok', () => {
    const texts = collectCourseTexts(c, () => story);
    expect(texts.every((t) => t.text.trim().length > 0)).toBe(true);
  });

  test('hikâye fonksiyonu verilmeden hikâye satırları dahil edilmez', () => {
    const texts = collectCourseTexts(c);
    expect(texts.map((t) => t.text)).not.toContain('Good evening.');
  });

  test('hikâyesi olmayan ünite atlanır', () => {
    const texts = collectCourseTexts(c, () => undefined);
    expect(texts).toHaveLength(3);
  });
});

describe('collectCourseTexts — new exercise types', () => {
  it('includes listen_select audio, chat lines and reading passages', () => {
    const course = {
      id: 'tr-en', fromLang: 'tr', toLang: 'en', title: 'x', vocab: [],
      units: [{ id: 'u1', order: 1, title: 't', description: 'd', lessons: [{ id: 'l1', order: 1, vocabIds: [], exercises: [
        { id: 'a', promptLang: 'en', type: 'listen_select', audioText: 'I am Tom', audioLang: 'en', options: ['I am Tom', 'I am Ali'], correctIndex: 0 },
        { id: 'b', promptLang: 'en', type: 'complete_chat', lines: [{ speaker: 'a', text: 'Hello!' }], options: ['Hi!', 'Bye'], correctIndex: 0 },
        { id: 'c', promptLang: 'en', type: 'read_answer', passage: 'Tom is a student. He is ten.', question: 'q', options: ['x', 'y'], correctIndex: 0 },
      ] }] }],
    } as unknown as Course;
    expect(collectCourseTexts(course).map((t) => t.text)).toEqual(['I am Tom', 'Hello!', 'Tom is a student. He is ten.']);
  });
});
