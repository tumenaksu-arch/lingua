import { chat, listenSel, pic, read } from '../builder';

/** The builders only shape data — ids and langs are injected by course(). */
describe('exercise builders', () => {
  test('listenSel shapes a listen_select exercise in the target language', () => {
    const ex = listenSel('You are my friend', ['You are my teacher', 'You are my friend'], 1)('c.u1.l1.e1', 'tr', 'en');
    expect(ex).toEqual({
      id: 'c.u1.l1.e1',
      type: 'listen_select',
      promptLang: 'en',
      audioText: 'You are my friend',
      audioLang: 'en',
      options: ['You are my teacher', 'You are my friend'],
      correctIndex: 1,
    });
  });

  test('pic keeps the prompt in the source language', () => {
    const ex = pic('"arkadaş" hangisi?', [{ emoji: '🤝', label: 'friend' }], 0)('c.u1.l1.e2', 'tr', 'en');
    expect(ex).toEqual({
      id: 'c.u1.l1.e2',
      type: 'picture_select',
      promptLang: 'tr',
      prompt: '"arkadaş" hangisi?',
      options: [{ emoji: '🤝', label: 'friend' }],
      correctIndex: 0,
    });
  });

  test('chat maps [speaker, text] tuples to line objects', () => {
    const ex = chat([['a', 'Are you a student?'], ['b', 'Yes.']], ['Yes, I am a student.', 'No.'], 0)('c.u1.l1.e3', 'tr', 'en');
    expect(ex).toEqual({
      id: 'c.u1.l1.e3',
      type: 'complete_chat',
      promptLang: 'en',
      lines: [
        { speaker: 'a', text: 'Are you a student?' },
        { speaker: 'b', text: 'Yes.' },
      ],
      options: ['Yes, I am a student.', 'No.'],
      correctIndex: 0,
    });
  });

  test('read shapes a read_answer exercise', () => {
    const ex = read('I am a student. You are my friend.', 'Metindeki kişiler kim?', ['Bir öğrenci'], 0)('c.u1.l1.e4', 'tr', 'en');
    expect(ex).toEqual({
      id: 'c.u1.l1.e4',
      type: 'read_answer',
      promptLang: 'en',
      passage: 'I am a student. You are my friend.',
      question: 'Metindeki kişiler kim?',
      options: ['Bir öğrenci'],
      correctIndex: 0,
    });
  });
});
