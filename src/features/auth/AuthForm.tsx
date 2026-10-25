import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { authErrorMessage } from '@/data';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, radii, spacing, useTheme } from '@/ui';

export type AuthMode = 'in' | 'up';

export type AuthFormProps = {
  initialMode?: AuthMode;
  /** Called after a successful sign-in or sign-up. */
  onDone?: () => void;
};

/**
 * E-mail/password form shared by the welcome screen and the auth modal:
 * sign in / sign up toggle, show-password, and Firebase password reset.
 */
export function AuthForm({ initialMode = 'in', onDone }: AuthFormProps) {
  const signIn = useAppStore((s) => s.signIn);
  const signUp = useAppStore((s) => s.signUp);
  const resetPassword = useAppStore((s) => s.resetPassword);
  const { colors } = useTheme();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      onDone?.();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Önce e-posta adresini yaz.');
      return;
    }
    try {
      await resetPassword(email.trim());
      setInfo('Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  const switchMode = () => {
    setMode(mode === 'in' ? 'up' : 'in');
    setError(null);
    setInfo(null);
  };

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }];

  return (
    <View style={styles.form}>
      <Caption>E-POSTA</Caption>
      <TextInput
        style={inputStyle}
        placeholder="ornek@eposta.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="E-posta"
      />
      <Caption>ŞİFRE</Caption>
      <View>
        <TextInput
          style={[inputStyle, styles.passwordInput]}
          placeholder="En az 6 karakter"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => {
            if (email && password.length >= 6 && !busy) void submit();
          }}
          accessibilityLabel="Şifre, en az 6 karakter"
        />
        <Pressable
          style={styles.eye}
          onPress={() => setShowPassword(!showPassword)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          hitSlop={8}
        >
          <Caption color={colors.secondaryText}>{showPassword ? 'GİZLE' : 'GÖSTER'}</Caption>
        </Pressable>
      </View>
      {error && <Caption color={colors.dangerText} accessibilityRole="alert">{error}</Caption>}
      {info && <Caption color={colors.primaryText} accessibilityLiveRegion="polite">{info}</Caption>}
      <Button
        title={mode === 'in' ? 'Giriş yap' : 'Hesap oluştur'}
        loading={busy}
        disabled={!email || password.length < 6}
        onPress={submit}
      />
      {mode === 'in' && (
        <Pressable onPress={forgot} accessibilityRole="button" style={styles.link}>
          <Body color={colors.secondaryText}>Şifremi unuttum</Body>
        </Pressable>
      )}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Button
        title={mode === 'in' ? 'Ücretsiz kayıt ol' : 'Zaten hesabım var'}
        variant="outline"
        onPress={switchMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  input: { borderWidth: 2, borderRadius: radii.md, padding: spacing.md, fontSize: 16, minHeight: 48 },
  passwordInput: { paddingRight: 80 },
  eye: { position: 'absolute', right: spacing.md, top: 0, bottom: 0, justifyContent: 'center' },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  divider: { height: 1, marginVertical: spacing.sm },
});
