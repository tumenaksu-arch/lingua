/**
 * Maskot "Vox" (papağan): her ruh hâli hatasız çizilir, test kimliği ve
 * erişilebilirlik etiketi taşır ("Vox mutlu" vb.).
 */
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Vox, type VoxMood } from '../Vox';

const METRICS = { frame: { x: 0, y: 0, width: 360, height: 740 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const MOODS: { mood: VoxMood; label: string }[] = [
  { mood: 'happy', label: 'Vox mutlu' },
  { mood: 'sad', label: 'Vox üzgün' },
  { mood: 'cheer', label: 'Vox coşkulu' },
  { mood: 'idle', label: 'Vox' },
  { mood: 'think', label: 'Vox düşünüyor' },
];

function renderVox(mood: VoxMood) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Vox mood={mood} size={48} />
    </SafeAreaProvider>,
  );
}

describe('Vox', () => {
  for (const { mood, label } of MOODS) {
    it(`renders mood "${mood}" with testID and accessibility label`, async () => {
      await renderVox(mood);
      expect(screen.getByTestId(`vox-${mood}`)).toBeTruthy();
      expect(screen.getByLabelText(label)).toBeTruthy();
    });
  }

  it('defaults to the idle mood', async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <Vox />
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('vox-idle')).toBeTruthy();
    expect(screen.getByLabelText('Vox')).toBeTruthy();
  });
});