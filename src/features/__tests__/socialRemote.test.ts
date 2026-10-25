import { getFirestoreDb } from '@/data/remote/firebase';
import { saveProfile } from '@/data/remote/social';

jest.mock('@/data/remote/firebase', () => ({ getFirestoreDb: jest.fn() }));

// The Firestore Web SDK is mocked: doc() returns a plain ref object whose
// `path` records the document path so assertions can check which doc was used.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(async () => {}),
  doc: jest.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
}));

const firestore = jest.requireMock<Record<string, jest.Mock>>('firebase/firestore');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getFirestoreDb).mockReturnValue({} as never);
});

describe('saveProfile invite lifecycle', () => {
  it('deletes the freshly created invite doc when the profile write fails', async () => {
    firestore.getDoc.mockResolvedValue({ exists: () => false });
    // First setDoc (invite create) succeeds, second (profile write) fails.
    firestore.setDoc.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'));

    await expect(saveProfile('u1', 'YıldızKedi')).rejects.toThrow('offline');

    // The orphaned invites/{code} doc must be rolled back before the error propagates.
    expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
    const deletedRef = firestore.deleteDoc.mock.calls[0]![0] as { path: string };
    expect(deletedRef.path).toMatch(/^invites\/[A-HJ-NP-Z2-9]{6}$/);
  });

  it('keeps the stored invite code on later saves and never touches invites', async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ invite_code: 'ABC234' }),
    });
    firestore.setDoc.mockResolvedValue(undefined);

    const profile = await saveProfile('u1', 'YıldızKedi');

    expect(profile?.invite_code).toBe('ABC234');
    expect(firestore.setDoc).toHaveBeenCalledTimes(1); // only the profile write
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
  });
});
