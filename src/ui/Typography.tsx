import { StyleSheet, Text, type TextProps } from 'react-native';

import { fontSize, fonts } from './theme';
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
  // Title/Heading: Space Grotesk display face (EduPilot); falls back to the platform
  // font until the bundled fonts are loaded in src/app/_layout.tsx.
  title: { fontSize: 28, letterSpacing: -0.5, fontFamily: fonts.display },
  heading: { fontSize: 20, fontFamily: fonts.display },
  body: { fontSize: fontSize.md, lineHeight: 24, fontFamily: fonts.body },
  // Mono caption, uppercase-style tracking; the text content is left as passed.
  caption: { fontSize: fontSize.xs, letterSpacing: 1.5, fontFamily: fonts.mono },
  center: { textAlign: 'center' },
});

export const Title = make(styles.title);
export const Heading = make(styles.heading);
export const Body = make(styles.body);
export const Caption = make(styles.caption, true);
