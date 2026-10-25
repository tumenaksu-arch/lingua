import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MigrateScreen from '@/app/migrate';
import { useAppStore } from '@/features/store';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
};

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <MigrateScreen />
    </SafeAreaProvider>,
  );

const LEGACY = { uid: 'firebase-uid-1', email: 'ali@example.com' };

beforeEach(() => {
  useAppStore.setState({
    legacyAccount: LEGACY,
    welcomed: false,
    finishLegacyMigration: jest.fn(() => Promise.resolve()),
    skipLegacyMigration: jest.fn(() => Promise.resolve()),
  });
});

describe('MigrateScreen (Firebase → Supabase taşıma)', () => {
  it('locks the prefilled legacy e-mail and offers the escape hatches', async () => {
    await renderScreen();

    const email = screen.getByLabelText('E-posta');
    expect(email).toHaveProp('value', 'ali@example.com');
    expect(email).toHaveProp('editable', false);

    expect(screen.getByText('E-postamı değiştir')).toBeTruthy();
    expect(screen.getByText(/Şimdilik geç/)).toBeTruthy();
  });

  it('"E-postamı değiştir" unlocks the e-mail field', async () => {
    await renderScreen();
    fireEvent.press(screen.getByText('E-postamı değiştir'));

    await waitFor(() => expect(screen.getByLabelText('E-posta')).toHaveProp('editable', true));
    // The offer to change it disappears while editing.
    expect(screen.queryByText('E-postamı değiştir')).toBeNull();
  });

  it('"Şimdilik geç" calls skipLegacyMigration (legacy keys are kept for a later attempt)', async () => {
    const skipLegacyMigration = useAppStore.getState().skipLegacyMigration as jest.Mock;
    await renderScreen();
    fireEvent.press(screen.getByText(/Şimdilik geç/));
    expect(skipLegacyMigration).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().finishLegacyMigration).not.toHaveBeenCalled();
  });
});
