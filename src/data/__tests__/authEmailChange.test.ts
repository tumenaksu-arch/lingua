/**
 * Anonymous → permanent account (madde 5, wave 2b): adding an e-mail to the
 * signed-in anonymous user goes through GoTrue updateUser (which sends the
 * 6-digit confirmation code) and the verification is an OTP of type
 * 'email_change' — the uid never changes, so class memberships survive.
 */
import { addEmailToAnonymous, verifyEmailChange } from '../remote/auth';
import { getSupabase } from '../remote/supabase';

jest.mock('../remote/supabase', () => ({ getSupabase: jest.fn() }));

const getSupabaseMock = getSupabase as jest.Mock;
const USER = { id: 'anon-uid-1', email: 'ali@example.com' };

function fakeClient() {
  return {
    auth: {
      updateUser: jest.fn(async () => ({ data: { user: { ...USER, email: null } }, error: null })),
      verifyOtp: jest.fn(async () => ({ data: { user: USER }, error: null })),
    },
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  getSupabaseMock.mockReturnValue(fakeClient());
});

it('addEmailToAnonymous calls updateUser with the new e-mail', async () => {
  await addEmailToAnonymous('ali@example.com');
  const sb = getSupabaseMock.mock.results[0]!.value as { auth: { updateUser: jest.Mock } };
  expect(sb.auth.updateUser).toHaveBeenCalledWith({ email: 'ali@example.com' });
});

it('verifyEmailChange verifies the 6-digit code as an email_change OTP', async () => {
  const u = await verifyEmailChange('ali@example.com', '123456');
  expect(u).toEqual({ uid: 'anon-uid-1', email: 'ali@example.com', displayName: null });
  const sb = getSupabaseMock.mock.results[0]!.value as { auth: { verifyOtp: jest.Mock } };
  expect(sb.auth.verifyOtp).toHaveBeenCalledWith({ email: 'ali@example.com', token: '123456', type: 'email_change' });
});

it('surfaces the GoTrue error when the code is wrong', async () => {
  getSupabaseMock.mockReturnValue({
    auth: {
      verifyOtp: jest.fn(async () => ({ data: { user: null }, error: { code: 'otp_expired', message: 'OTP expired' } })),
    },
  } as never);
  await expect(verifyEmailChange('ali@example.com', '999999')).rejects.toMatchObject({ code: 'otp_expired' });
});
