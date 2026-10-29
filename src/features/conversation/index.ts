/**
 * Konuşma pratiği özelliğinin (madde 6) dışa açık yüzeyi: yapay zekâ durum
 * kontrolü ve hata sözleşmesi buradan yeniden dışa aktarılır; böylece ders
 * içindeki "Cevabımı açıkla" düğmesi (`features/lesson`) veri katmanını değil
 * bu fasadyayı kullanır. Uygulama `data/remote/ai.ts` dosyasındadır.
 */
export { aiStatus, AiError } from '@/data/remote/ai';
export type { AiErrorCode, AiStatus } from '@/data/remote/ai';
