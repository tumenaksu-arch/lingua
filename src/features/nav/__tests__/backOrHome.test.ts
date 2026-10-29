import { router } from 'expo-router';

import { backOrHome } from '../backOrHome';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));

const r = router as unknown as { back: jest.Mock; replace: jest.Mock; canGoBack: jest.Mock };

beforeEach(() => jest.clearAllMocks());

it('goes back when there is history', () => {
  r.canGoBack.mockReturnValue(true);
  backOrHome();
  expect(r.back).toHaveBeenCalled();
  expect(r.replace).not.toHaveBeenCalled();
});

it('opened by a direct link (no history): goes home instead of doing nothing', () => {
  r.canGoBack.mockReturnValue(false);
  backOrHome();
  expect(r.replace).toHaveBeenCalledWith('/');
  expect(r.back).not.toHaveBeenCalled();
});
