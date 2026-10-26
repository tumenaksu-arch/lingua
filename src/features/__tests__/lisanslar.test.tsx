import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LicensesScreen from '@/app/lisanslar';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

it('renders all five license entries and the privacy line', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LicensesScreen />
    </SafeAreaProvider>,
  );

  expect(screen.getByText('Kokoro-82M')).toBeTruthy();
  expect(screen.getByText(/Apache-2\.0 · hexgrad/)).toBeTruthy();
  expect(screen.getByText('Piper')).toBeTruthy();
  expect(screen.getByText(/GPL-3\.0 · sunucuda çalışır/)).toBeTruthy();
  expect(screen.getByText('Thorsten-Voice')).toBeTruthy();
  expect(screen.getByText(/CC0/)).toBeTruthy();
  expect(screen.getByText('SIWIS French speech corpus')).toBeTruthy();
  expect(screen.getByText(/CC-BY 4\.0 · Kokoro ff_siwis voice/)).toBeTruthy();
  expect(screen.getByText('espeak-ng')).toBeTruthy();
  expect(screen.getByText('GPL-3.0 · sunucuda')).toBeTruthy();

  expect(
    screen.getByText('Doğal sesler Love-Vox sunucusunda üretilir; ses dosyaları önbelleğe alınır, metinler kaydedilmez.'),
  ).toBeTruthy();
});
