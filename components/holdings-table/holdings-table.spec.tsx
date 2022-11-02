import { render } from '@testing-library/react';

import HoldingsTable from './holdings-table';

describe('HoldingsTable', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<HoldingsTable />);
    expect(baseElement).toBeTruthy();
  });
});
