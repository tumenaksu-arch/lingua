import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fontSize, fontWeight } from './theme';

type Props = TextProps & { color?: string; center?: boolean };

function make(base: object) {
  return function Typo({ style, color, center, ...rest }: Props) {
    return (
      <Text
        {...rest}
        style={[base, color ? { color } : null, center ? styles.center : null, style]}
      />
    );
  };
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text, lineHeight: 24 },
  caption: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8 },
  center: { textAlign: 'center' },
});

export const Title = make(styles.title);
export const Heading = make(styles.heading);
export const Body = make(styles.body);
export const Caption = make(styles.caption);
