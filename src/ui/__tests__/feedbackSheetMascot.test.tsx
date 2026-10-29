/**
 * FeedbackSheet maskotu (madde 3c): doğruda mutlu, yanlışta üzgün Vox;
 * "Maskot animasyonları" ayarı kapalıyken ya da mascot={false} ile Vox yok.
 */
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSettingsStore } from '../settingsStore';
import { FeedbackSheet } from '../FeedbackSheet';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 740 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function renderSheet(props: Partial<React.ComponentProps<typeof FeedbackSheet>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <FeedbackSheet result="correct" onContinue={() => {}} {...props} />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  useSettingsStore.setState({ mascotAnimations: true, hydrated: true });
});

it('shows a happy Vox on correct answers', async () => {
  await renderSheet({ result: 'correct' });
  expect(screen.getByTestId('vox-happy')).toBeTruthy();
});

it('shows a sad Vox on wrong answers', async () => {
  await renderSheet({ result: 'wrong' });
  expect(screen.getByTestId('vox-sad')).toBeTruthy();
});

it('hides Vox when the "Maskot animasyonları" setting is off', async () => {
  useSettingsStore.setState({ mascotAnimations: false });
  await renderSheet({ result: 'correct' });
  expect(screen.queryByTestId('vox-happy')).toBeNull();
  expect(screen.queryByTestId('vox-sad')).toBeNull();
});

it('hides Vox when mascot={false} even with the setting on', async () => {
  await renderSheet({ result: 'wrong', mascot: false });
  expect(screen.queryByTestId('vox-sad')).toBeNull();
});

it('renders no sheet (hence no Vox) while result is null', async () => {
  await renderSheet({ result: null });
  expect(screen.queryByTestId('vox-happy')).toBeNull();
});
