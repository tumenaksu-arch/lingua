import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { authErrorMessage } from '@/data';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, radii, spacing, upperTr, useTheme } from '@/ui';

export type EmailCodeFormProps = {
  /** Prefills (and when `lockEmail`, fixes) the e-mail field — used by the migration screen. */
  initialEmail?: string;
  lockEmail?: boolean;
  /** Called after the code was verified and the password step finished or skipped. */
  onDone?: () => void;
  /** Same appearances as AuthForm; 'landing' matches the EduPilot-styled welcome page. */
  appearance?: 'app' | 'landing';
};

/** EduPilot landing palette — fixed, independent of the app theme (same as AuthForm). */
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

type Phase = 'send' | 'verify' | 'password';

/**
 * E-posta kodu ile giriş: "Kodu gönder" → 6 haneli kodu "Doğrula" → (isteğe bağlı)
 * "Yeni şifreni belirle". Doğrulama başarılı olunca kullanıcı oturum açmış olur
 * (onAuthChanged ilerlemeyi taşır + senkronlar); şifre adımı "Şimdilik geç" ile
 * atlanabilir. "Şifremi unuttum" da bu akışı kullanır.
 */
export function EmailCodeForm({ initialEmail = '', lockEmail = false, onDone, appearance = 'app' }: EmailCodeFormProps) {
  const sendLoginCode = useAppStore((s) => s.sendLoginCode);
  const verifyLoginCode = useAppStore((s) => s.verifyLoginCode);
  const setPassword = useAppStore((s) => s.setPassword);
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('send');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPasswordValue] = useState('');
  const [repeat, setRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await sendLoginCode(email.trim());
      setPhase('verify');
      setInfo('6 haneli kodu e-postana gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await verifyLoginCode(email.trim(), code.trim());
      setPhase('password');
      setInfo('Kod doğru! İstersen bu hesap için bir şifre de belirleyebilirsin.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setBusy(true);
    setError(null);
    try {
      await setPassword(password);
      onDone?.();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const skipPassword = () => onDone?.();

  if (appearance === 'landing') {
    const input = [landingStyles.input, lockEmail && landingStyles.inputLocked];
    const codeOk = /^\d{6}$/.test(code.trim());
    const passwordsOk = password.length >= 6 && password === repeat;
    return (
      <View style={landingStyles.form}>
        <Text style={landingStyles.label}>E-POSTA</Text>
        <TextInput
          style={input}
          placeholder="ornek@eposta.com"
          placeholderTextColor={ep.dim}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!lockEmail}
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="E-posta"
        />
        {phase === 'send' && (
          <Pressable
            onPress={send}
            disabled={!email.trim() || busy}
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Kodu gönder (yükleniyor)' : 'Kodu gönder'}
            style={[landingStyles.primaryButton, (!email.trim() || busy) && { backgroundColor: ep.accentDisabled }]}
          >
            <Text style={landingStyles.primaryButtonText}>{busy ? upperTr('Yükleniyor…') : upperTr('Kodu gönder')}</Text>
          </Pressable>
        )}
        {phase !== 'send' && (
          <>
            <Text style={landingStyles.label}>KOD</Text>
            <TextInput
              style={landingStyles.input}
              placeholder="6 haneli kod"
              placeholderTextColor={ep.dim}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              accessibilityLabel="6 haneli kod"
            />
          </>
        )}
        {phase === 'verify' && (
          <Pressable
            onPress={verify}
            disabled={!codeOk || busy}
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Doğrula (yükleniyor)' : 'Doğrula'}
            style={[landingStyles.primaryButton, (!codeOk || busy) && { backgroundColor: ep.accentDisabled }]}
          >
            <Text style={landingStyles.primaryButtonText}>{busy ? upperTr('Yükleniyor…') : upperTr('Doğrula')}</Text>
          </Pressable>
        )}
        {phase === 'password' && (
          <>
            <Text style={landingStyles.label}>YENİ ŞİFRE (EN AZ 6 KARAKTER)</Text>
            <TextInput
              style={landingStyles.input}
              placeholder="En az 6 karakter"
              placeholderTextColor={ep.dim}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              value={password}
              onChangeText={setPasswordValue}
              accessibilityLabel="Yeni şifre, en az 6 karakter"
            />
            <Text style={landingStyles.label}>YENİ ŞİFRE (TEKRAR)</Text>
            <TextInput
              style={landingStyles.input}
              placeholder="Şifreyi tekrar yaz"
              placeholderTextColor={ep.dim}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              value={repeat}
              onChangeText={setRepeat}
              accessibilityLabel="Yeni şifre tekrar"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              style={landingStyles.link}
            >
              <Text style={landingStyles.linkText}>{showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text>
            </Pressable>
            <Pressable
              onPress={savePassword}
              disabled={!passwordsOk || busy}
              accessibilityRole="button"
              accessibilityLabel={busy ? 'Şifreyi kaydet (yükleniyor)' : 'Şifreyi kaydet'}
              style={[landingStyles.primaryButton, (!passwordsOk || busy) && { backgroundColor: ep.accentDisabled }]}
            >
              <Text style={landingStyles.primaryButtonText}>
                {busy ? upperTr('Yükleniyor…') : upperTr('Şifreyi kaydet')}
              </Text>
            </Pressable>
            <Pressable onPress={skipPassword} accessibilityRole="button" style={landingStyles.link}>
              <Text style={landingStyles.linkText}>Şimdilik geç</Text>
            </Pressable>
          </>
        )}
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
      </View>
    );
  }

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }];
  const codeOk = /^\d{6}$/.test(code.trim());
  const passwordsOk = password.length >= 6 && password === repeat;

  return (
    <View style={styles.form}>
      <Caption>E-POSTA</Caption>
      <TextInput
        style={[inputStyle, lockEmail && styles.inputLocked]}
        placeholder="ornek@eposta.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!lockEmail}
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="E-posta"
      />
      {phase === 'send' && (
        <Button title="Kodu gönder" loading={busy} disabled={!email.trim()} onPress={send} />
      )}
      {phase !== 'send' && (
        <>
          <Caption>KOD</Caption>
          <TextInput
            style={inputStyle}
            placeholder="6 haneli kod"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            accessibilityLabel="6 haneli kod"
          />
        </>
      )}
      {phase === 'verify' && (
        <Button title="Doğrula" loading={busy} disabled={!codeOk} onPress={verify} />
      )}
      {phase === 'password' && (
        <>
          <Caption>YENİ ŞİFRE (EN AZ 6 KARAKTER)</Caption>
          <TextInput
            style={inputStyle}
            placeholder="En az 6 karakter"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            value={password}
            onChangeText={setPasswordValue}
            accessibilityLabel="Yeni şifre, en az 6 karakter"
          />
          <Caption>YENİ ŞİFRE (TEKRAR)</Caption>
          <TextInput
            style={inputStyle}
            placeholder="Şifreyi tekrar yaz"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            value={repeat}
            onChangeText={setRepeat}
            accessibilityLabel="Yeni şifre tekrar"
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" style={styles.link}>
            <Body color={colors.secondaryText}>{showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</Body>
          </Pressable>
          <Button title="Şifreyi kaydet" loading={busy} disabled={!passwordsOk} onPress={savePassword} />
          <Pressable onPress={skipPassword} accessibilityRole="button" style={styles.link}>
            <Body color={colors.secondaryText}>Şimdilik geç</Body>
          </Pressable>
        </>
      )}
      {error && <Caption color={colors.dangerText} accessibilityRole="alert">{error}</Caption>}
      {info && <Caption color={colors.primaryText} accessibilityLiveRegion="polite">{info}</Caption>}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  input: { borderWidth: 2, borderRadius: radii.md, padding: spacing.md, fontSize: 16, minHeight: 48 },
  inputLocked: { opacity: 0.6 },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
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
  inputLocked: { opacity: 0.6 },
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
  linkText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: ep.text },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: ep.danger },
  info: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: ep.accent },
});
