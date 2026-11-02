import { fireEvent, render, screen } from '@testing-library/react-native';

import { CloseButton } from '../CloseButton';

it('exposes a button role with the "Kapat" label', async () => {
  await render(<CloseButton onPress={() => {}} />);
  expect(screen.getByRole('button', { name: 'Kapat' })).toBeTruthy();
});

it('honours a custom label and fires onPress', async () => {
  const onPress = jest.fn();
  await render(<CloseButton onPress={onPress} label="Dersi kapat" />);
  fireEvent.press(screen.getByRole('button', { name: 'Dersi kapat' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
