import { fireEvent, render } from '@testing-library/react-native';

import { SegmentedControl } from '../SegmentedControl';

const OPTIONS = [
  { value: 'week', label: 'Bu hafta' },
  { value: 'friends', label: 'Arkadaşlar' },
] as const;

const byRole = (role: string) => (instance: { props: Record<string, unknown> }) => instance.props.accessibilityRole === role;

it('exposes a tablist with tab roles and labels', async () => {
  const { container } = await render(<SegmentedControl options={[...OPTIONS]} value="week" onChange={() => {}} />);
  const tablists = container.queryAll(byRole('tablist'), { includeSelf: true });
  expect(tablists).toHaveLength(1);
  const tabs = container.queryAll(byRole('tab'));
  expect(tabs).toHaveLength(2);
  expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Bu hafta', 'Arkadaşlar']);
});

it('marks the current value as selected and fires onChange for another tab', async () => {
  const onChange = jest.fn();
  const { container } = await render(<SegmentedControl options={[...OPTIONS]} value="week" onChange={onChange} />);
  const [week, friends] = container.queryAll(byRole('tab'));
  expect(week!.props.accessibilityState).toEqual({ selected: true });
  expect(friends!.props.accessibilityState).toEqual({ selected: false });
  fireEvent.press(friends!);
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('friends');
});
