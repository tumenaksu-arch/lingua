import { StyleSheet, Text, type TextProps } from 'react-native';

import { fontSize, fontWeight } from './theme';
import { useTheme } from './useTheme';

type Props = TextProps & { color?: string; center?: boolean };

function make(base: object, muted = false) {
  return function Typo({ style, color, center, ...rest }: Props) {
    const { colors } = useTheme();
    return (
      <Text
        {...rest}
        style={[base, { color: color ?? (muted ? colors.textMuted : colors.text) }, center ? styles.center : null, style]}
      />
    );
  };
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, lineHeight: 24 },
  caption: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  center: { textAlign: 'center' },
});

export const Title = make(styles.title);
export const Heading = make(styles.heading);
export const Body = make(styles.body);
export const Caption = make(styles.caption, true);
