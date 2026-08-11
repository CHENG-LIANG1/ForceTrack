/** Component-level acceptance coverage for the Task 2 shell, routes, locale, and theme controls. */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import type { UserPreferences } from '@/domain/member';
import type { PreferencesRepository } from '@/infrastructure/repositories';

class MemoryPreferencesRepository implements PreferencesRepository {
  readonly saves: UserPreferences[] = [];

  constructor(private preferences: UserPreferences) {}

  async load(): Promise<UserPreferences> {
    return this.preferences;
  }

  async save(preferences: UserPreferences): Promise<void> {
    this.preferences = preferences;
    this.saves.push(preferences);
  }
}

function renderApp(
  path: string,
  preferences: UserPreferences = { locale: 'en-US', theme: 'light' },
) {
  window.history.replaceState({}, '', path);
  const repository = new MemoryPreferencesRepository(preferences);
  render(
    <AppProviders preferencesRepository={repository}>
      <App />
    </AppProviders>,
  );
  return repository;
}

describe('App shell', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en-US';
    document.documentElement.dataset.theme = 'light';
  });

  it.each([
    ['/', '/board'],
    ['/unknown', '/board'],
  ])('redirects %s to the Board route', async (path, expectedPath) => {
    renderApp(path);

    expect(
      await screen.findByRole('heading', { name: 'Board', level: 1 }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(expectedPath);
  });

  it('navigates between Board and Timeline with an active link', async () => {
    const user = userEvent.setup();
    renderApp('/board');

    const timelineLink = await screen.findByRole('link', {
      name: 'Timeline',
    });
    await user.click(timelineLink);

    expect(
      screen.getByRole('heading', { name: 'Timeline', level: 1 }),
    ).toBeInTheDocument();
    expect(timelineLink).toHaveClass('nav-item-active');
    expect(window.location.pathname).toBe('/timeline');
  });

  it('switches locale and theme immediately and persists complete preferences', async () => {
    const user = userEvent.setup();
    const repository = renderApp('/board', {
      locale: 'en-US',
      theme: 'dark',
    });
    const settingsButton = await screen.findByRole('button', {
      name: 'Settings',
    });
    await user.click(settingsButton);
    const chineseButton = screen.getByRole('button', { name: '中文' });
    const lightThemeButton = screen.getByRole('button', {
      name: 'Vercel Light',
    });
    await waitFor(() => expect(chineseButton).toBeEnabled());
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(chineseButton);
    await user.click(lightThemeButton);

    expect(
      screen.getByRole('heading', { name: '看板', level: 1 }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'zh-CN');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await waitFor(() =>
      expect(repository.saves.at(-1)).toEqual({
        locale: 'zh-CN',
        theme: 'light',
      }),
    );
  });

  it('shows two previewable Vercel themes and closes settings with Escape', async () => {
    const user = userEvent.setup();
    renderApp('/board', { locale: 'en-US', theme: 'dark' });

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Vercel Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Vercel Light' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /System/ }),
    ).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Settings' }),
    ).not.toBeInTheDocument();
  });
});
