import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { ONBOARDING_STORAGE_KEY } from '@/app/OnboardingProvider';
import { AppProviders } from '@/app/AppProviders';

function renderApp(path = '/') {
  window.history.replaceState({}, '', path);
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

describe('onboarding', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts automatically on first visit and remembers when it is skipped', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Welcome to ForceTrack' }),
    ).toBeVisible();
    expect(document.documentElement).toHaveClass('onboarding-active');
    expect(document.body).toHaveClass('onboarding-active');
    await user.click(screen.getByRole('button', { name: 'Skip tour' }));

    await waitFor(() =>
      expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe(
        'complete',
      ),
    );
    expect(
      screen.queryByRole('heading', { name: 'Welcome to ForceTrack' }),
    ).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('onboarding-active');
    expect(document.body).not.toHaveClass('onboarding-active');
  });

  it('lets returning users replay the tour from Help and shortcuts', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete');
    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Help and shortcuts' }),
    );
    await user.click(screen.getByRole('button', { name: 'Replay onboarding' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome to ForceTrack' }),
    ).toBeVisible();
  });

  it('switches through every primary tab and restores the starting page when skipped', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete');
    renderApp('/board');

    await screen.findByRole('heading', { name: 'Board', level: 1 });
    const startingPath = window.location.pathname;
    await user.click(
      screen.getByRole('button', { name: 'Help and shortcuts' }),
    );
    await user.click(screen.getByRole('button', { name: 'Replay onboarding' }));

    const nextTo = async (heading: string) => {
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByRole('heading', { name: heading });
    };

    await nextTo('Keep work separated by project');
    await nextTo('Summary: understand project health');
    await waitFor(() => expect(window.location.pathname).toMatch(/\/summary$/));
    expect(screen.getByText('3 of 11')).toBeVisible();

    await nextTo('Focus the Summary');
    await nextTo('Backlog: shape upcoming work');
    await waitFor(() => expect(window.location.pathname).toMatch(/\/backlog$/));

    await nextTo('Plan Sprints deliberately');
    await nextTo('Board: deliver the active Sprint');
    await waitFor(() => expect(window.location.pathname).toMatch(/\/board$/));

    await nextTo('Keep status current');
    await nextTo('Timeline: review the schedule');
    await waitFor(() =>
      expect(window.location.pathname).toMatch(/\/timeline$/),
    );

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    await waitFor(() => expect(window.location.pathname).toBe(startingPath));
  });
});
