import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { EmailCodeForm } from '@/features/auth/EmailCodeForm';
import { useAppStore } from '@/features/store';
import { Body, Button, Screen, Title, spacing, useTheme } from '@/ui';

/**
 * One-time Firebase → Supabase account migration. Shown on boot when a leftover
 * Firebase session exists but no Supabase session: the e-mail on file receives a
 * 6-digit code (once); verifying it signs the user in, after which the store moves
 * the local progress from the old Firebase uid to the new account and syncs it.
 */
export default function MigrateScreen() {
  const legacyAccount = useAppStore((s) => s.legacyAccount);
  const finishLegacyMigration = useAppStore((s) => s.finishLegacyMigration);
  const { colors } = useTheme();

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Title accessibilityRole="header">Yeni giriş sistemine geçtik</Title>
          <Body color={colors.textMuted}>
            Love-Vox artık yeni hesap sistemini kullanıyor. İlerlemen kaybolmasın diye e-postana bir kerelik 6 haneli
            bir kod gönderiyoruz; kodu doğruladığında hesabın hazır olur ve eski ilerlemen otomatik olarak taşınır.
          </Body>
          {legacyAccount ? (
            <EmailCodeForm
              initialEmail={legacyAccount.email ?? ''}
              lockEmail={Boolean(legacyAccount.email)}
              onDone={() => void finishLegacyMigration()}
            />
          ) : (
            <Button title="Devam et" onPress={() => void finishLegacyMigration()} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.md },
  body: { gap: spacing.md, paddingBottom: spacing.lg },
});
