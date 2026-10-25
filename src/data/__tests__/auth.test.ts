import { AuthUnavailableError, authErrorMessage, currentUser, onAuthChanged, sendLoginCode, setPassword, signIn, signUp, verifyLoginCode } from '../remote/auth';
import { getSupabase } from '../remote/supabase';

jest.mock('../remote/supabase', () => ({ getSupabase: jest.fn() }));

const getSupabaseMock = getSupabase as jest.Mock;

const USER = { id: 'supa-uid-1', email: 'ali@example.com' };

function fakeClient(session: { user: typeof USER } | null = null) {
  const auth = {
    signUp: jest.fn(async () => ({ data: { user: USER }, error: null })),
    signInWithPassword: jest.fn(async () => ({ data: { user: USER }, error: null })),
    signInWithOtp: jest.fn(async () => ({ data: {}, error: null })),
    verifyOtp: jest.fn(async () => ({ data: { user: USER }, error: null })),
    updateUser: jest.fn(async () => ({ data: { user: USER }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  };
  return { auth } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  getSupabaseMock.mockReturnValue(fakeClient());
});

describe('auth on Supabase', () => {
  it('signUp maps the GoTrue user to AuthUser (displayName always null)', async () => {
    const u = await signUp('ali@example.com', 'gizli123');
    expect(u).toEqual({ uid: 'supa-uid-1', email: 'ali@example.com', displayName: null });
    const sb = getSupabaseMock.mock.results[0]!.value as { auth: { signUp: jest.Mock } };
    expect(sb.auth.signUp).toHaveBeenCalledWith({ email: 'ali@example.com', password: 'gizli123' });
  });

  it('signIn uses signInWithPassword and maps the user', async () => {
    const u = await signIn('ali@example.com', 'gizli123');
    expect(u.uid).toBe('supa-uid-1');
    const sb = getSupabaseMock.mock.results[0]!.value as { auth: { signInWithPassword: jest.Mock } };
    expect(sb.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ali@example.com', password: 'gizli123' });
  });

  it('sendLoginCode signs in with OTP and may create the user', async () => {
    await sendLoginCode('ali@example.com');
    const sb = getSupabaseMock.mock.results[0]!.value as { auth: { signInWithOtp: jest.Mock } };
    expect(sb.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'ali@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('verifyLoginCode verifies the 6-digit code as an e-mail OTP', async () => {
    const u = await verifyLoginCode('ali@example.com', '123456');
    expect(u.uid).toBe('supa-uid-1');
    const sb = getSupabaseMock.mock.results[0]!.value as { auth: { verifyOtp: jest.Mock } };
    expect(sb.auth.verifyOtp).toHaveBeenCalledWith({ email: 'ali@example.com', token: '123456', type: 'email' });
  });

  it('setPassword updates the signed-in user', async () => {
    await setPassword('yeniSifre1');
    const sb = getSupabaseMock.mock.results[0]!.value as { auth: { updateUser: jest.Mock } };
    expect(sb.auth.updateUser).toHaveBeenCalledWith({ password: 'yeniSifre1' });
  });

  it('surfaces GoTrue errors to the caller', async () => {
    const err = { code: 'invalid_credentials', message: 'Invalid credentials', status: 400 };
    getSupabaseMock.mockReturnValue({
      auth: { signInWithPassword: jest.fn(async () => ({ data: { user: null }, error: err })) },
    } as never);
    await expect(signIn('ali@example.com', 'yanlis')).rejects.toEqual(err);
  });

  it('throws AuthUnavailableError when Supabase is not configured', async () => {
    getSupabaseMock.mockReturnValue(null);
    await expect(signIn('a@b.c', '123456')).rejects.toBeInstanceOf(AuthUnavailableError);
    await expect(sendLoginCode('a@b.c')).rejects.toBeInstanceOf(AuthUnavailableError);
    await expect(currentUser()).resolves.toBeNull();
  });

  it('currentUser reads the persisted session', async () => {
    getSupabaseMock.mockReturnValue(fakeClient({ user: USER }));
    await expect(currentUser()).resolves.toEqual({ uid: 'supa-uid-1', email: 'ali@example.com', displayName: null });
    getSupabaseMock.mockReturnValue(fakeClient(null));
    await expect(currentUser()).resolves.toBeNull();
  });
});

describe('onAuthChanged', () => {
  it('emits the restored session first and then auth events, and unsubscribes', async () => {
    const cb = jest.fn();
    const client = fakeClient({ user: USER });
    getSupabaseMock.mockReturnValue(client);
    const unsub = onAuthChanged(cb);
    await Promise.resolve(); // flush getSession()
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith({ uid: 'supa-uid-1', email: 'ali@example.com', displayName: null });

    const { auth } = client as never as { auth: { onAuthStateChange: jest.Mock } };
    const stateCb = auth.onAuthStateChange.mock.calls[0]![0] as (e: string, s: { user: typeof USER } | null) => void;
    stateCb('SIGNED_IN', { user: USER });
    expect(cb).toHaveBeenCalledTimes(2);
    stateCb('SIGNED_OUT', null);
    expect(cb).toHaveBeenLastCalledWith(null);

    unsub();
    const sub = auth.onAuthStateChange.mock.results[0]!.value as {
      data: { subscription: { unsubscribe: jest.Mock } };
    };
    expect(sub.data.subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not double-emit the initial user from INITIAL_SESSION', async () => {
    const cb = jest.fn();
    const client = fakeClient({ user: USER });
    getSupabaseMock.mockReturnValue(client);
    onAuthChanged(cb);
    await Promise.resolve();
    const { auth } = client as never as { auth: { onAuthStateChange: jest.Mock } };
    const stateCb = auth.onAuthStateChange.mock.calls[0]![0] as (e: string, s: unknown) => void;
    stateCb('INITIAL_SESSION', { user: USER });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('emits the initial user only once when INITIAL_SESSION wins the race', async () => {
    const cb = jest.fn();
    const client = fakeClient({ user: USER });
    getSupabaseMock.mockReturnValue(client);
    onAuthChanged(cb);
    const { auth } = client as never as { auth: { onAuthStateChange: jest.Mock } };
    const stateCb = auth.onAuthStateChange.mock.calls[0]![0] as (e: string, s: unknown) => void;
    stateCb('INITIAL_SESSION', { user: USER }); // fires before getSession() resolves
    await Promise.resolve();
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when Supabase is not configured', () => {
    getSupabaseMock.mockReturnValue(null);
    const cb = jest.fn();
    const unsub = onAuthChanged(cb);
    unsub();
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('authErrorMessage (GoTrue → Turkish)', () => {
  const err = (code: string | undefined, message: string, status?: number) =>
    Object.assign(new Error(message), code === undefined ? {} : { code }, status === undefined ? {} : { status }) as unknown;

  it('invalid credentials', () => {
    expect(authErrorMessage(err('invalid_credentials', 'Invalid credentials', 400))).toBe('E-posta veya şifre hatalı.');
  });
  it('already registered (code and legacy message text)', () => {
    expect(authErrorMessage(err('email_exists', 'User already registered', 422))).toBe('Bu e-posta zaten kayıtlı.');
    expect(authErrorMessage(err(undefined, 'A user with this email address has already been registered'))).toBe(
      'Bu e-posta zaten kayıtlı.',
    );
  });
  it('weak password', () => {
    expect(authErrorMessage(err('weak_password', 'Password must be at least 6 characters'))).toBe(
      'Şifre en az 6 karakter olmalı.',
    );
  });
  it('invalid or expired OTP', () => {
    expect(authErrorMessage(err('otp_expired', 'OTP expired'))).toBe('Kod hatalı ya da süresi dolmuş.');
    expect(authErrorMessage(err(undefined, 'Token has expired or is invalid'))).toBe('Kod hatalı ya da süresi dolmuş.');
    expect(authErrorMessage(err(undefined, 'Invalid token'))).toBe('Kod hatalı ya da süresi dolmuş.');
  });
  it('rate limit by code or HTTP 429', () => {
    expect(authErrorMessage(err('over_request_rate_limit', 'Too many requests', 429))).toBe(
      'Çok fazla deneme. Biraz sonra tekrar dene.',
    );
    expect(authErrorMessage(err(undefined, 'For security purposes, you can only request this after', 429))).toBe(
      'Çok fazla deneme. Biraz sonra tekrar dene.',
    );
  });
  it('network failure', () => {
    expect(authErrorMessage(Object.assign(new Error('Failed to fetch'), { name: 'FetchError' }))).toBe(
      'Ağ hatası. Bağlantını kontrol et.',
    );
  });
  it('validation_failed with a password message maps to the password hint, not the e-mail one', () => {
    expect(authErrorMessage(err('validation_failed', 'password must be at least 6 characters', 422))).toBe(
      'Şifre en az 6 karakter olmalı.',
    );
  });
  it('non-length password errors fall through to the raw message', () => {
    expect(authErrorMessage(err(undefined, 'New password should be different from the old password.'))).toBe(
      'New password should be different from the old password.',
    );
  });
  it('invalid e-mail', () => {
    expect(authErrorMessage(err('invalid_email', 'Invalid email', 400))).toBe('E-posta adresi geçersiz.');
    expect(authErrorMessage(err('validation_failed', 'email must be a valid email', 422))).toBe(
      'E-posta adresi geçersiz.',
    );
  });
  it('unknown errors fall back to the raw message', () => {
    expect(authErrorMessage(new Error('Beklenmedik'))).toBe('Beklenmedik');
  });
});
