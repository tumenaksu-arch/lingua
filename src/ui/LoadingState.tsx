import { ActivityIndicator } from 'react-native';

import { useTheme } from './useTheme';

export type LoadingStateProps = {
  /** Erişilebilirlik etiketi (ekran okuyucu duyurusu). */
  label?: string;
};

/**
 * Ortak yükleniyor kalıbı: büyük aktivite göstergesi + erişilebilir etiket.
 * "Konuş" sekmesindeki kalıp esas alındı; yerleşimi (ortalama vb.) çağıran
 * ekrana bırakılır — bileşen yalnızca göstergeyi çizer.
 */
export function LoadingState({ label = 'Yükleniyor' }: LoadingStateProps) {
  const { colors } = useTheme();
  return (
    <ActivityIndicator
      color={colors.primary}
      size="large"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    />
  );
}
