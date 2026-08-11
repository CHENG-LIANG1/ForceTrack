import { render, screen } from '@testing-library/react';

import { App } from '@/app/App';

describe('App', () => {
  it('renders the ForceTrack foundation page', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /move work forward/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('shadcn/ui')).toBeInTheDocument();
    expect(screen.getByText('Foundation ready')).toBeInTheDocument();
  });
});
