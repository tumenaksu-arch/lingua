import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { addEmailToAnonymous, authErrorMessage, verifyEmailChange } from '@/data';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, spacing, useTheme } from '@/ui';

type Phase = 'email' | 'code' | 'password';

/**
 * "E-posta ekle" for an ANONYMOUS class account (madde 5, wave 2b): adds an
 * e-mail to the signed-in anonymous user (GoTrue sends a 6-digit
 * `email_change` code), verifies it, then optionally sets a password so the
 * account survives a device wipe. The uid never changes — class memberships
 * and progress are kept.
 */
export function AddEmailForm({ onDone }: { onDone?: () => void }) {
  const { colors } = useTheme();
  const setPassword = useAppStore((s) => s.setPassword);
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPasswordValue] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const inputStyle = {
    borderWidth: 2,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 48,
    borderColor: colors.border,
    color: colors.text,
  } as const;

  const send = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await addEmailToAnonymous(email.trim());
      setPhase('code');
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
      await verifyEmailChange(email.trim(), code.trim());
      setPhase('password');
      setInfo('E-postan doğrulandı! İstersen bu hesap için bir şifre de belirle.');
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

  const codeOk = /^\d{6}$/.test(code.trim());
  const passwordsOk = password.length >= 6 && password === repeat;

  return (
    <View style={{ gap: spacing.sm }}>
      {phase === 'email' && (
        <>
          <Caption color={colors.primaryText}>E-POSTA</Caption>
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
          <Button title="Kodu gönder" loading={busy} disabled={!email.trim()} onPress={() => void send()} />
        </>
      )}
      {phase === 'code' && (
        <>
          <Caption color={colors.primaryText}>6 HANELİ KOD</Caption>
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
          <Button title="Doğrula" loading={busy} disabled={!codeOk} onPress={() => void verify()} />
        </>
      )}
      {phase === 'password' && (
        <>
          <Caption color={colors.primaryText}>ŞİFRE (EN AZ 6 KARAKTER)</Caption>
          <TextInput
            style={inputStyle}
            placeholder="En az 6 karakter"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPasswordValue}
            accessibilityLabel="Yeni şifre, en az 6 karakter"
          />
          <Caption color={colors.primaryText}>ŞİFRE (TEKRAR)</Caption>
          <TextInput
            style={inputStyle}
            placeholder="Şifreyi tekrar yaz"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete="new-password"
            value={repeat}
            onChangeText={setRepeat}
            accessibilityLabel="Yeni şifre tekrar"
          />
          <Button title="Şifreyi kaydet" loading={busy} disabled={!passwordsOk} onPress={() => void savePassword()} />
          <Button title="Şimdilik geç" variant="outline" onPress={() => onDone?.()} />
        </>
      )}
      {error && (
        <Caption color={colors.dangerText} accessibilityRole="alert">
          {error}
        </Caption>
      )}
      {info && (
        <Caption color={colors.primaryText} accessibilityLiveRegion="polite">
          {info}
        </Caption>
      )}
    </View>
  );
}

/** The anonymous-account note shown next to the form on the profile screen. */
export function AnonymousAccountNote() {
  const { colors } = useTheme();
  return (
    <Body color={colors.textMuted}>Hesabın bu cihaza bağlı. Kalıcı yapmak için e-posta ekle.</Body>
  );
}
