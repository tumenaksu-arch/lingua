import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAppStore } from '@/features/store';
import { EmailCodeForm } from '../auth/EmailCodeForm';

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

let sendLoginCode: jest.Mock;
let verifyLoginCode: jest.Mock;
let setPassword: jest.Mock;

beforeEach(() => {
  sendLoginCode = jest.fn(() => Promise.resolve());
  verifyLoginCode = jest.fn(() => Promise.resolve());
  setPassword = jest.fn(() => Promise.resolve());
  useAppStore.setState({ sendLoginCode, verifyLoginCode, setPassword });
});

describe('EmailCodeForm (kod ile giriş)', () => {
  it('send code → verify → set password → onDone', async () => {
    const onDone = jest.fn();
    await render(<EmailCodeForm onDone={onDone} />);

    await type('E-posta', '  ali@example.com ');
    await press('Kodu gönder');
    expect(sendLoginCode).toHaveBeenCalledWith('ali@example.com');
    expect(await screen.findByText(/6 haneli kodu e-postana gönderdik/)).toBeTruthy();

    await type('6 haneli kod', ' 123456 ');
    await press('Doğrula');
    expect(verifyLoginCode).toHaveBeenCalledWith('ali@example.com', '123456');
    expect(await screen.findByText(/Kod doğru!/)).toBeTruthy();

    await type('Yeni şifre, en az 6 karakter', 'yeniSifre1');
    await type('Yeni şifre tekrar', 'yeniSifre1');
    await press('Şifreyi kaydet');
    expect(setPassword).toHaveBeenCalledWith('yeniSifre1');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the e-mail fixed and prefilled when lockEmail is set (migration screen)', async () => {
    await render(<EmailCodeForm initialEmail="ali@example.com" lockEmail />);
    const email = screen.getByLabelText('E-posta');
    expect(email).toHaveProp('editable', false);
    expect(email).toHaveProp('value', 'ali@example.com');
  });

  it('"Şimdilik geç" skips the password step without calling setPassword', async () => {
    const onDone = jest.fn();
    await render(<EmailCodeForm onDone={onDone} />);
    await type('E-posta', 'ali@example.com');
    await press('Kodu gönder');
    await type('6 haneli kod', '123456');
    await press('Doğrula');
    await screen.findByText(/Kod doğru!/);

    await press('Şimdilik geç');
    expect(setPassword).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('requires matching passwords of at least 6 characters', async () => {
    await render(<EmailCodeForm />);
    await type('E-posta', 'ali@example.com');
    await press('Kodu gönder');
    await type('6 haneli kod', '123456');
    await press('Doğrula');
    await screen.findByText(/Kod doğru!/);

    await type('Yeni şifre, en az 6 karakter', 'kisa1');
    await type('Yeni şifre tekrar', 'kisa1');
    expect(screen.getByRole('button', { name: 'Şifreyi kaydet' })).toBeDisabled();

    await type('Yeni şifre, en az 6 karakter', 'uzunSifre1');
    await type('Yeni şifre tekrar', 'baskaSifre2');
    expect(screen.getByRole('button', { name: 'Şifreyi kaydet' })).toBeDisabled();

    await type('Yeni şifre tekrar', 'uzunSifre1');
    expect(screen.getByRole('button', { name: 'Şifreyi kaydet' })).toBeEnabled();
  });

  it('shows the Turkish OTP error when verification fails', async () => {
    verifyLoginCode.mockRejectedValueOnce({ code: 'otp_expired', message: 'OTP expired' });
    await render(<EmailCodeForm />);
    await type('E-posta', 'ali@example.com');
    await press('Kodu gönder');
    await type('6 haneli kod', '999999');
    await press('Doğrula');
    expect(await screen.findByText('Kod hatalı ya da süresi dolmuş.')).toBeTruthy();
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('shows the Turkish rate-limit error when sending fails', async () => {
    sendLoginCode.mockRejectedValueOnce({ code: 'over_request_rate_limit', message: 'Too many requests', status: 429 });
    await render(<EmailCodeForm />);
    await type('E-posta', 'ali@example.com');
    await press('Kodu gönder');
    expect(await screen.findByText('Çok fazla deneme. Biraz sonra tekrar dene.')).toBeTruthy();
  });

  it('"Kodu tekrar gönder" returns to the send phase so an expired code is not a dead end', async () => {
    await render(<EmailCodeForm />);
    await type('E-posta', 'ali@example.com');
    await press('Kodu gönder');
    await type('6 haneli kod', '123456');

    await press('Kodu tekrar gönder');
    // Back in the send phase: the code field is gone, the e-mail stays.
    expect(screen.queryByLabelText('6 haneli kod')).toBeNull();
    expect(screen.getByRole('button', { name: 'Kodu gönder' })).toBeEnabled();
    expect(screen.getByLabelText('E-posta')).toHaveProp('value', 'ali@example.com');

    // Resending works and reaches the verify phase again.
    await press('Kodu gönder');
    expect(sendLoginCode).toHaveBeenCalledTimes(2);
    expect(await screen.findByLabelText('6 haneli kod')).toBeTruthy();
  });

  it('an expired code shows the error and the resend path recovers from it', async () => {
    verifyLoginCode.mockRejectedValueOnce({ code: 'otp_expired', message: 'OTP expired' });
    await render(<EmailCodeForm />);
    await type('E-posta', 'ali@example.com');
    await press('Kodu gönder');
    await type('6 haneli kod', '999999');
    await press('Doğrula');
    expect(await screen.findByText('Kod hatalı ya da süresi dolmuş.')).toBeTruthy();

    await press('Kodu tekrar gönder');
    expect(screen.queryByText('Kod hatalı ya da süresi dolmuş.')).toBeNull(); // error cleared
    expect(screen.getByRole('button', { name: 'Kodu gönder' })).toBeEnabled();
  });
});
