import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { AuthForm } from '@/features/auth/AuthForm';
import { Body, Button, Screen, Title, spacing, useTheme } from '@/ui';

/** Sign-in modal opened from the profile tab (the welcome screen embeds the same form). */
export default function AuthScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Title accessibilityRole="header">Giriş yap</Title>
          <Body color={colors.textMuted}>İlerlemen cihazlar arasında senkronize olur.</Body>
          <AuthForm onDone={() => router.back()} />
        </ScrollView>
        <Button title="Kapat" variant="secondary" onPress={() => router.back()} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.md },
  body: { gap: spacing.md, paddingBottom: spacing.lg },
});
