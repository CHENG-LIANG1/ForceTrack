import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';

function BrokenView(): never {
  throw new Error('render failure');
}

describe('AppErrorBoundary', () => {
  it('replaces render failures with a safe reload action', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <AppErrorBoundary
        title="Page unavailable"
        description="Reload to recover."
        reloadLabel="Reload app"
      >
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Page unavailable');
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeVisible();
    consoleError.mockRestore();
  });
});
