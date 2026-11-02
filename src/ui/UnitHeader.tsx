import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ProficiencyLevel } from '@/domain/proficiency';

import { LevelBadge } from './LevelBadge';
import { PathNode } from './PathNode';
import { ProgressBar } from './ProgressBar';
import { Body, Caption, Heading } from './Typography';
import { spacing } from './theme';
import { useTheme } from './useTheme';
import { upperTr } from './upperTr';

export type UnitHeaderProps = {
  /** 1-based unit number shown as "Bölüm N". */
  index: number;
  title: string;
  description: string;
  level: ProficiencyLevel;
  lessonsDone: number;
  lessonsTotal: number;
  unitDone: boolean;
  hasNotes: boolean;
  onNotes?: () => void;
  /** Undefined for completed units — no skip exam offered. */
  onSkip?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ünite başlık bloğu (yol ekranı v2): numara + CEFR rozeti, başlık, açıklama,
 * ünite ilerleme çubuğu ve notlar/atla düğümleri. Notlar ve atla, ders düğümleriyle
 * aynı PathNode geometrisini kullanır; erişilebilirlik etiketleri ekran okuyucuda
 * tek tek anons edilir.
 */
export function UnitHeader({
  index,
  title,
  description,
  level,
  lessonsDone,
  lessonsTotal,
  unitDone,
  hasNotes,
  onNotes,
  onSkip,
  style,
}: UnitHeaderProps) {
  const { colors } = useTheme();
  const progress = lessonsTotal > 0 ? lessonsDone / lessonsTotal : 0;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: unitDone ? colors.warning : colors.border }, style]}
    >
      <View style={styles.topRow}>
        <Caption color={colors.primaryText}>{upperTr(`Bölüm ${index}`)}</Caption>
        <LevelBadge level={level} />
      </View>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Bölüm ${index}, ${title}${unitDone ? ', tamamlandı' : ''}. ${description}`}
      >
        <Heading>{title}</Heading>
        <Body color={colors.textMuted}>{description}</Body>
      </View>
      <View style={styles.progressRow}>
        <ProgressBar
          style={styles.progress}
          progress={progress}
          height={6}
          accessibilityLabel={`${title}: ${lessonsDone}/${lessonsTotal} ders tamamlandı`}
        />
        <Caption color={colors.textMuted}>{`${lessonsDone}/${lessonsTotal}`}</Caption>
      </View>
      {hasNotes || onSkip ? (
        <View style={styles.actions}>
          {hasNotes && onNotes ? (
            <View style={styles.action}>
              <PathNode state="active" kind="notes" onPress={onNotes} accessibilityLabel={`${title} notları`} />
              <Caption accessible={false} color={colors.primaryText}>
                {upperTr('Notlar')}
              </Caption>
            </View>
          ) : null}
          {onSkip ? (
            <View style={styles.action}>
              <PathNode state="active" kind="skip" onPress={onSkip} accessibilityLabel={`${title} ünitesini atla`} />
              <Caption accessible={false} color={colors.primaryText}>
                {upperTr('Atla')}
              </Caption>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg, borderRadius: 10, borderWidth: 1, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progress: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.xl },
  action: { alignItems: 'center', gap: 2 },
});
