import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from './theme';

export type ScreenProps = ViewProps & {
  /** Edges that receive safe-area padding. Default: top + bottom. */
  edges?: ('top' | 'bottom')[];
  /** Horizontal padding; default spacing.lg. Set 0 for full-bleed. */
  padding?: number;
  background?: string;
};

export function Screen({
  edges = ['top', 'bottom'],
  padding = spacing.lg,
  background = colors.background,
  style,
  children,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      style={[
        styles.root,
        {
          backgroundColor: background,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingHorizontal: padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
