import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterChip } from '../FilterChip';

it('exposes a button role and applies the uppercase-tr label formatting', async () => {
  await render(<FilterChip label="koyu" selected={false} onPress={() => {}} />);
  expect(screen.getByRole('button', { name: 'koyu' })).toBeTruthy();
  expect(screen.getByText('KOYU')).toBeTruthy();
});

it('reflects the selected state and fires onPress', async () => {
  const onPress = jest.fn();
  await render(<FilterChip label="Açık" selected onPress={onPress} accessibilityLabel="Açık tema" />);
  const chip = screen.getByRole('button', { name: 'Açık tema' });
  expect(chip.props.accessibilityState).toEqual({ selected: true, disabled: false });
  fireEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('marks an unselected chip and honours a custom accessibility label', async () => {
  await render(<FilterChip label="%50" selected={false} onPress={() => {}} accessibilityLabel="Yavaş hız yüzde 50" />);
  const chip = screen.getByRole('button', { name: 'Yavaş hız yüzde 50' });
  expect(chip.props.accessibilityState).toEqual({ selected: false, disabled: false });
});
