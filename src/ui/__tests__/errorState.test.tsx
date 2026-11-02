import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorState } from '../ErrorState';

it('announces the message as an alert and renders the retry button', async () => {
  const onRetry = jest.fn();
  await render(<ErrorState message="Bağlantı kurulamadı." onRetry={onRetry} />);
  expect(screen.getByRole('alert').props.children).toBe('Bağlantı kurulamadı.');
  fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('renders no button without onRetry', async () => {
  await render(<ErrorState message="Yalnızca okunur hata." />);
  expect(screen.getByText('Yalnızca okunur hata.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

it('supports a custom retry label and a secondary action', async () => {
  const onRetry = jest.fn();
  const onSecondary = jest.fn();
  await render(
    <ErrorState
      message="Hata"
      onRetry={onRetry}
      retryLabel="Yeniden yükle"
      secondary={{ label: 'Ana sayfa', onPress: onSecondary }}
    />,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Yeniden yükle' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Ana sayfa' }));
  expect(onSecondary).toHaveBeenCalledTimes(1);
});
