/**
 * "E-posta ekle" for anonymous class accounts (madde 5, wave 2b): the flow
 * calls addEmailToAnonymous (GoTrue updateUser → sends the 6-digit code),
 * then verifyEmailChange (verifyOtp with type 'email_change'), then sets a
 * password (min 6) through the app store.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { addEmailToAnonymous, verifyEmailChange } from '@/data';
import { useAppStore } from '@/features/store';
import { AddEmailForm } from '@/features/classes/AddEmailForm';

jest.mock('@/data', () => ({
  ...jest.requireActual('@/data'),
  addEmailToAnonymous: jest.fn(),
  verifyEmailChange: jest.fn(),
}));

const addEmail = jest.mocked(addEmailToAnonymous);
const verifyChange = jest.mocked(verifyEmailChange);
let setPassword: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  addEmail.mockResolvedValue(undefined);
  verifyChange.mockResolvedValue({ uid: 'anon-1', email: 'ali@example.com', displayName: null });
  setPassword = jest.fn(() => Promise.resolve());
  useAppStore.setState({ setPassword });
});

async function renderForm() {
  await render(<AddEmailForm onDone={() => {}} />);
}

it('email → code → password: updateUser first, then verifyOtp (email_change), then setPassword', async () => {
  await renderForm();

  await fireEvent.changeText(screen.getByLabelText('E-posta'), '  ali@example.com ');
  await fireEvent.press(screen.getByRole('button', { name: 'Kodu gönder' }));
  await waitFor(() => expect(addEmail).toHaveBeenCalledWith('ali@example.com'));
  expect(screen.getByText(/6 haneli kodu e-postana gönderdik/)).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('6 haneli kod'), ' 123456 ');
  await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));
  await waitFor(() => expect(verifyChange).toHaveBeenCalledWith('ali@example.com', '123456'));
  expect(screen.getByText(/E-postan doğrulandı!/)).toBeTruthy();

  // Password shorter than 6 keeps the button disabled.
  await fireEvent.changeText(screen.getByLabelText('Yeni şifre, en az 6 karakter'), 'kisa1');
  await fireEvent.changeText(screen.getByLabelText('Yeni şifre tekrar'), 'kisa1');
  expect(screen.getByRole('button', { name: 'Şifreyi kaydet' })).toBeDisabled();

  await fireEvent.changeText(screen.getByLabelText('Yeni şifre, en az 6 karakter'), 'uzunSifre1');
  await fireEvent.changeText(screen.getByLabelText('Yeni şifre tekrar'), 'baskaSifre2');
  expect(screen.getByRole('button', { name: 'Şifreyi kaydet' })).toBeDisabled();

  await fireEvent.changeText(screen.getByLabelText('Yeni şifre tekrar'), 'uzunSifre1');
  await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi kaydet' }));
  await waitFor(() => expect(setPassword).toHaveBeenCalledWith('uzunSifre1'));
});

it('shows the Turkish error when the code verification fails', async () => {
  verifyChange.mockRejectedValueOnce({ code: 'otp_expired', message: 'OTP expired' });
  await renderForm();
  await fireEvent.changeText(screen.getByLabelText('E-posta'), 'ali@example.com');
  await fireEvent.press(screen.getByRole('button', { name: 'Kodu gönder' }));
  await fireEvent.changeText(screen.getByLabelText('6 haneli kod'), '999999');
  await fireEvent.press(screen.getByRole('button', { name: 'Doğrula' }));
  expect(await screen.findByText('Kod hatalı ya da süresi dolmuş.')).toBeTruthy();
  expect(setPassword).not.toHaveBeenCalled();
});
