/**
 * Turkish-aware uppercase for UI labels ("Giriş yap" → "GİRİŞ YAP", "Kayıt ol" → "KAYIT OL").
 * Plain `toUpperCase()` maps i → I, dropping the dot. The i/ı pair is mapped explicitly instead of
 * `toLocaleUpperCase('tr-TR')` so the result does not depend on the JS engine's Intl data (Hermes, web).
 * Only for Turkish UI text: it would also dot the i in a foreign word.
 */
export function upperTr(text: string): string {
  return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}
