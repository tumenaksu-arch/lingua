import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { authErrorMessage } from '@/data';
import { useAppStore } from '@/features/store';
import { Body, Button, Caption, Screen, Title, colors, radii, spacing } from '@/ui';

export default function AuthScreen() {
  const signIn = useAppStore((s) => s.signIn);
  const signUp = useAppStore((s) => s.signUp);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') {
        await signIn(email.trim(), password);
        router.back();
      } else {
        await signUp(email.trim(), password);
        setInfo('Hesabın oluşturuldu, giriş yapıldı.');
        router.back();
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
        <Title>{mode === 'in' ? 'Giriş yap' : 'Hesap oluştur'}</Title>
        <Body color={colors.textMuted}>İlerlemen cihazlar arasında senkronize olur.</Body>
        <TextInput style={styles.input} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} accessibilityLabel="E-posta" />
        <TextInput style={styles.input} placeholder="Şifre (en az 6 karakter)" secureTextEntry value={password} onChangeText={setPassword} accessibilityLabel="Şifre" />
        {error && <Caption color={colors.danger}>{error}</Caption>}
        {info && <Caption color={colors.primary}>{info}</Caption>}
        <Button title={mode === 'in' ? 'Giriş yap' : 'Kayıt ol'} loading={busy} disabled={!email || password.length < 6} onPress={submit} />
        <Button title={mode === 'in' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'} variant="outline" onPress={() => setMode(mode === 'in' ? 'up' : 'in')} />
        <View style={{ flex: 1 }} />
        <Button title="Kapat" variant="secondary" onPress={() => router.back()} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, gap: spacing.md },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, fontSize: 16, color: colors.text, backgroundColor: colors.surface, minHeight: 48 },
});
