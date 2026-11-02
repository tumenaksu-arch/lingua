import { render, screen } from '@testing-library/react-native';

import { LoadingState } from '../LoadingState';

it('exposes an accessible progress indicator with the loading label', async () => {
  const view = await render(<LoadingState />);
  expect(view.toJSON()?.props.accessibilityRole).toBe('progressbar');
  expect(screen.getByLabelText('Yükleniyor')).toBeTruthy();
});

it('honours a custom label', async () => {
  await render(<LoadingState label="Senaryolar yükleniyor" />);
  expect(screen.getByLabelText('Senaryolar yükleniyor')).toBeTruthy();
});
