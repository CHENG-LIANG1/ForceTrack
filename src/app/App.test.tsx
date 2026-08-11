/** Component-level acceptance coverage for the Task 2 shell, routes, locale, and theme controls. */
import { act, render, screen, waitFor } from '@testing-library/react';
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
    const languageSelect = await screen.findByRole('combobox', {
      name: 'Language',
    });
    const themeSelect = screen.getByRole('combobox', { name: 'Theme' });

    await waitFor(() => expect(languageSelect).toBeEnabled());
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.selectOptions(languageSelect, 'zh-CN');
    await user.selectOptions(themeSelect, 'light');

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

  it('updates the effective theme when the system color scheme changes', async () => {
    let matches = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        () =>
          ({
            get matches() {
              return matches;
            },
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addEventListener: (
              _type: string,
              listener: EventListenerOrEventListenerObject,
            ) => listeners.add(listener as () => void),
            removeEventListener: (
              _type: string,
              listener: EventListenerOrEventListenerObject,
            ) => listeners.delete(listener as () => void),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as MediaQueryList,
      ),
    );

    renderApp('/board', { locale: 'en-US', theme: 'system' });
    await screen.findByRole('heading', { name: 'Board' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    matches = true;
    act(() => listeners.forEach((listener) => listener()));

    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark'),
    );
  });
});
