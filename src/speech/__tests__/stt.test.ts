import { act, renderHook } from '@testing-library/react-native';

/**
 * Simulates Expo Go: `expo-speech-recognition` throws at import time because the
 * native module is missing. The hook module must still load and report `unavailable`.
 */
jest.mock('expo-speech-recognition', () => {
  throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
});

test('stt module loads without the native module and reports unavailable', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useSpeechRecognition } = require('../stt') as typeof import('../stt');
  const { result } = await renderHook(() => useSpeechRecognition('en'));
  expect(result.current.status).toBe('unavailable');
  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe('unavailable');
  expect(result.current.error).toBeNull();
});
