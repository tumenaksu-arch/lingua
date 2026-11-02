import { fireEvent, render, screen } from '@testing-library/react-native';

import { Body } from '../Typography';
import { NoticeCard } from '../NoticeCard';

it('renders children with a warning tone and an action', async () => {
  const onPress = jest.fn();
  await render(
    <NoticeCard tone="warning" action={{ label: 'Yazılı moda geç', onPress }}>
      <Body>Mikrofona erişilemiyor.</Body>
    </NoticeCard>,
  );
  expect(screen.getByText('Mikrofona erişilemiyor.')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Yazılı moda geç' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('renders without an action', async () => {
  await render(
    <NoticeCard tone="danger">
      <Body>Bir şeyler ters gitti.</Body>
    </NoticeCard>,
  );
  expect(screen.getByText('Bir şeyler ters gitti.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
