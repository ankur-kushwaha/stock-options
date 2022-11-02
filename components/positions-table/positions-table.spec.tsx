import { render } from '@testing-library/react';

import PositionsTable from './positions-table';

describe('PositionsTable', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<PositionsTable />);
    expect(baseElement).toBeTruthy();
  });
});
