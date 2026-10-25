import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from '@/app/welcome';
import { useAppStore } from '@/features/store';
import { AuthForm } from '../AuthForm';

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

let signIn: jest.Mock;
let signUp: jest.Mock;
let resetPassword: jest.Mock;
let continueAsGuest: jest.Mock;

beforeEach(() => {
  signIn = jest.fn(() => Promise.resolve());
  signUp = jest.fn(() => Promise.resolve());
  resetPassword = jest.fn(() => Promise.resolve());
  continueAsGuest = jest.fn(() => Promise.resolve());
  useAppStore.setState({ signIn, signUp, resetPassword, continueAsGuest });
});

describe('AuthForm', () => {
  it('signs in with the trimmed e-mail and calls onDone', async () => {
    const onDone = jest.fn();
    await render(<AuthForm onDone={onDone} />);
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeDisabled();

    await type('E-posta', '  ali@example.com ');
    await type('Şifre, en az 6 karakter', 'gizli123');
    await press('Giriş yap');

    expect(signIn).toHaveBeenCalledWith('ali@example.com', 'gizli123');
    expect(signUp).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('switches to sign-up and creates the account', async () => {
    await render(<AuthForm />);
    await press('Ücretsiz kayıt ol');
    await type('E-posta', 'yeni@example.com');
    await type('Şifre, en az 6 karakter', 'gizli123');
    await press('Hesap oluştur');
    expect(signUp).toHaveBeenCalledWith('yeni@example.com', 'gizli123');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows the Firebase error in Turkish and does not call onDone', async () => {
    signIn.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
    const onDone = jest.fn();
    await render(<AuthForm onDone={onDone} />);
    await type('E-posta', 'ali@example.com');
    await type('Şifre, en az 6 karakter', 'yanlis12');
    await press('Giriş yap');
    expect(screen.getByText('E-posta veya şifre hatalı.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('password reset asks for the e-mail first, then sends it without claiming the account exists', async () => {
    await render(<AuthForm />);
    await press('Şifremi unuttum');
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByText('Önce e-posta adresini yaz.')).toBeTruthy();

    await type('E-posta', ' ali@example.com ');
    await press('Şifremi unuttum');
    expect(resetPassword).toHaveBeenCalledWith('ali@example.com');
    expect(screen.getByText(/Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi/)).toBeTruthy();
  });

  it('show/hide toggles password visibility', async () => {
    await render(<AuthForm />);
    expect(screen.getByLabelText('Şifre, en az 6 karakter')).toHaveProp('secureTextEntry', true);
    await press('Şifreyi göster');
    expect(screen.getByLabelText('Şifre, en az 6 karakter')).toHaveProp('secureTextEntry', false);
  });
});

describe('WelcomeScreen', () => {
  it('offers sign-in, the platform downloads, and continuing without an account', async () => {
    const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <WelcomeScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeTruthy();
    expect(screen.getAllByText('İngilizce', { exact: false }).length).toBeGreaterThan(0);
    // EduPilot-style sections, with the downloadable platforms outside the Android shell.
    for (const label of ['Android uygulamasını indir', "Love-Vox'u cihaza yükle (PWA)", 'Kurulum yardımını göster']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    await press('Hesapsız dene →');
    expect(continueAsGuest).toHaveBeenCalledTimes(1);
  });

  it('hides the download/install platforms inside the Android shell (it already is the app)', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true, Plugins: {} };
    try {
      const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
      await render(
        <SafeAreaProvider initialMetrics={metrics}>
          <WelcomeScreen />
        </SafeAreaProvider>,
      );
      expect(screen.queryByRole('button', { name: 'Android uygulamasını indir' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeTruthy();
    } finally {
      delete (globalThis as { Capacitor?: unknown }).Capacitor;
      Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
    }
  });
});
