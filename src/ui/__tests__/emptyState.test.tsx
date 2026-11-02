import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

it('renders title and body, optionally with an icon and an action', async () => {
  const onPress = jest.fn();
  await render(
    <EmptyState
      icon="messages"
      title="Konuşma pratiği yakında"
      body="Çok yakında burada olacak!"
      action={{ label: 'Geri', onPress }}
    />,
  );
  expect(screen.getByText('Konuşma pratiği yakında')).toBeTruthy();
  expect(screen.getByText('Çok yakında burada olacak!')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('renders a bare card without icon, body or action', async () => {
  await render(<EmptyState title="Henüz kayıt yok" />);
  expect(screen.getByText('Henüz kayıt yok')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
