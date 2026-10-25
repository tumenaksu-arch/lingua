import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { authErrorMessage } from '@/data';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, radii, spacing, upperTr, useTheme } from '@/ui';
import { EmailCodeForm } from './EmailCodeForm';

export type AuthMode = 'in' | 'up';

export type AuthFormProps = {
  initialMode?: AuthMode;
  /** Called after a successful sign-in or sign-up. */
  onDone?: () => void;
  /**
   * 'app' (default) is the in-app style used by the profile auth modal; 'landing' is the
   * EduPilot-styled variant used on the welcome page (fixed palette, pill buttons, mono labels).
   */
  appearance?: 'app' | 'landing';
};

/** EduPilot landing palette — fixed, independent of the app theme. */
const ep = {
  text: '#e8eaf2',
  dim: '#8e97b5',
  accent: '#d18b63',
  accentDisabled: 'rgba(209,139,99,0.35)',
  onAccent: '#0e1220',
  inputBorder: 'rgba(232,234,242,0.18)',
  inputBg: 'rgba(14,18,32,0.45)',
  hairline: 'rgba(232,234,242,0.10)',
  danger: '#ff8080',
};

/**
 * E-mail/password form shared by the welcome screen and the auth modal:
 * sign in / sign up toggle, show-password, and the 6-digit code flow
 * ("E-postama kod gönder" / "Şifremi unuttum") via EmailCodeForm.
 */
export function AuthForm({ initialMode = 'in', onDone, appearance = 'app' }: AuthFormProps) {
  const signIn = useAppStore((s) => s.signIn);
  const signUp = useAppStore((s) => s.signUp);
  const { colors } = useTheme();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codeFlow, setCodeFlow] = useState(false);
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

  const switchMode = () => {
    setMode(mode === 'in' ? 'up' : 'in');
    setError(null);
    setInfo(null);
  };

  if (codeFlow) {
    return <EmailCodeForm initialEmail={email} onDone={onDone} appearance={appearance} />;
  }

  if (appearance === 'landing') {
    const canSubmit = Boolean(email) && password.length >= 6;
    const submitTitle = mode === 'in' ? 'Giriş yap' : 'Hesap oluştur';
    const switchTitle = mode === 'in' ? 'Ücretsiz kayıt ol' : 'Zaten hesabım var';
    return (
      <View style={landingStyles.form}>
        <Text style={landingStyles.label}>E-POSTA</Text>
        <TextInput
          style={landingStyles.input}
          placeholder="ornek@eposta.com"
          placeholderTextColor={ep.dim}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="E-posta"
        />
        <Text style={landingStyles.label}>ŞİFRE</Text>
        <View>
          <TextInput
            style={[landingStyles.input, landingStyles.passwordInput]}
            placeholder="En az 6 karakter"
            placeholderTextColor={ep.dim}
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
            style={landingStyles.eye}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            hitSlop={8}
          >
            <Text style={landingStyles.eyeText}>{showPassword ? 'GİZLE' : 'GÖSTER'}</Text>
          </Pressable>
        </View>
        {error && (
          <Text style={landingStyles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        {info && (
          <Text style={landingStyles.info} accessibilityLiveRegion="polite">
            {info}
          </Text>
        )}
        <Pressable
          onPress={submit}
          disabled={!canSubmit || busy}
          accessibilityRole="button"
          accessibilityLabel={busy ? `${submitTitle} (yükleniyor)` : submitTitle}
          style={[landingStyles.primaryButton, (!canSubmit || busy) && { backgroundColor: ep.accentDisabled }]}
        >
          <Text style={landingStyles.primaryButtonText}>
            {busy ? upperTr('Yükleniyor…') : upperTr(submitTitle)}
          </Text>
        </Pressable>
        {mode === 'in' && (
          <View style={landingStyles.links}>
            <Pressable onPress={() => setCodeFlow(true)} accessibilityRole="button" style={landingStyles.link}>
              <Text style={landingStyles.linkText}>Şifremi unuttum</Text>
            </Pressable>
            <Pressable onPress={() => setCodeFlow(true)} accessibilityRole="button" style={landingStyles.link}>
              <Text style={landingStyles.linkText}>E-postama kod gönder</Text>
            </Pressable>
          </View>
        )}
        <View style={landingStyles.divider} />
        <Pressable
          onPress={switchMode}
          accessibilityRole="button"
          accessibilityLabel={switchTitle}
          style={landingStyles.secondaryButton}
        >
          <Text style={landingStyles.secondaryButtonText}>{upperTr(switchTitle)}</Text>
        </Pressable>
      </View>
    );
  }

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
        <View style={styles.links}>
          <Pressable onPress={() => setCodeFlow(true)} accessibilityRole="button" style={styles.link}>
            <Body color={colors.secondaryText}>Şifremi unuttum</Body>
          </Pressable>
          <Pressable onPress={() => setCodeFlow(true)} accessibilityRole="button" style={styles.link}>
            <Body color={colors.secondaryText}>E-postama kod gönder</Body>
          </Pressable>
        </View>
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
  links: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  divider: { height: 1, marginVertical: spacing.sm },
});

const landingStyles = StyleSheet.create({
  form: { gap: spacing.sm },
  label: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 2,
    color: ep.dim,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    borderColor: ep.inputBorder,
    backgroundColor: ep.inputBg,
    paddingHorizontal: spacing.md,
    height: 44,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: ep.text,
  },
  passwordInput: { paddingRight: 80 },
  eye: { position: 'absolute', right: spacing.md, top: 0, bottom: 0, justifyContent: 'center' },
  eyeText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 1.5, color: ep.dim },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: ep.danger },
  info: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: ep.accent },
  primaryButton: {
    borderRadius: 100,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: ep.accent,
    marginTop: spacing.xs,
  },
  primaryButtonText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.5,
    color: ep.onAccent,
  },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  links: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  linkText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: ep.text },
  divider: { height: 1, backgroundColor: ep.hairline, marginVertical: spacing.sm },
  secondaryButton: {
    borderRadius: 100,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: ep.accent,
  },
  secondaryButtonText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.5,
    color: ep.accent,
  },
});
