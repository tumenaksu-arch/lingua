import { normalize, isAnswerCorrect, speechMatch, isSpeechCorrect, levenshtein } from '../grading';

describe('grading', () => {
  test('normalize strips punctuation, case and spaces, keeps diacritics', () => {
    // ı/İ/I all fold to i (locale-independent; a Turkish device lowercases I to ı) — see normalize()
    expect(normalize('  Günaydın,  Dünya! ')).toBe('günaydin dünya');
    expect(normalize("I'm fine.")).toBe('im fine');
    expect(normalize('¿Cómo estás?')).toBe('cómo estás');
  });
  test('isAnswerCorrect', () => {
    expect(isAnswerCorrect('i am fine', ["I'm fine", 'I am fine.'])).toBe(true);
    expect(isAnswerCorrect('', ['x'])).toBe(false);
    expect(isAnswerCorrect('i am good', ['I am fine'])).toBe(false);
  });
  test('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
  test('speechMatch tolerates small errors, rejects different sentences', () => {
    expect(speechMatch('the cat is black', 'The cat is black.')).toBe(1);
    expect(isSpeechCorrect('the cat is blak', 'The cat is black')).toBe(true);
    expect(isSpeechCorrect('hello world', 'The cat is black')).toBe(false);
    expect(speechMatch('', 'x')).toBe(0);
  });
});
