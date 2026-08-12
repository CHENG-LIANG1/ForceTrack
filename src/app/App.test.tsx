/** Component-level acceptance coverage for the Task 2 shell, routes, locale, and theme controls. */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import type { UserPreferences } from '@/domain/member';
import type {
  LoadResult,
  PreferencesRepository,
  TaskRepository,
} from '@/infrastructure/repositories';
import { makeSnapshot } from '@/test/fixtures';

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
  preferences: UserPreferences = {
    locale: 'en-US',
    theme: 'light',
    lastProjectId: null,
    recentProjectIds: [],
  },
  taskRepository?: TaskRepository,
) {
  window.history.replaceState({}, '', path);
  const repository = new MemoryPreferencesRepository(preferences);
  render(
    <AppProviders
      preferencesRepository={repository}
      taskRepository={taskRepository}
    >
      <App />
    </AppProviders>,
  );
  return repository;
}

class RecoveryTaskRepository implements TaskRepository {
  constructor(
    private readonly result: LoadResult | Error,
    private readonly failSaves = false,
  ) {}

  async load(): Promise<LoadResult> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }

  async save(): Promise<void> {
    if (this.failSaves) throw new Error('storage unavailable');
  }
}

describe('App shell', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en-US';
    document.documentElement.dataset.theme = 'light';
  });

  it.each([
    ['/', '/projects/project-forcetrack/summary'],
    ['/unknown', '/projects/project-forcetrack/summary'],
    [
      '/projects/project-forcetrack/members',
      '/projects/project-forcetrack/summary',
    ],
  ])('redirects %s to the preferred project', async (path, expectedPath) => {
    renderApp(path);

    expect(
      await screen.findByRole('heading', { name: 'Summary', level: 1 }),
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
    expect(window.location.pathname).toBe(
      '/projects/project-forcetrack/timeline',
    );
  });

  it('switches locale and theme immediately and persists complete preferences', async () => {
    const user = userEvent.setup();
    const repository = renderApp('/board', {
      locale: 'en-US',
      theme: 'dark',
      lastProjectId: null,
      recentProjectIds: [],
    });
    const settingsButton = await screen.findByRole('button', {
      name: 'Open user menu',
    });
    await user.click(settingsButton);
    const chineseButton = screen.getByRole('button', { name: '中文' });
    const lightThemeButton = screen.getByRole('button', {
      name: 'Light',
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
        lastProjectId: 'project-forcetrack',
        recentProjectIds: ['project-forcetrack'],
      }),
    );
  });

  it('shows only light and dark themes and closes the user menu with Escape', async () => {
    const user = userEvent.setup();
    renderApp('/board', {
      locale: 'en-US',
      theme: 'dark',
      lastProjectId: null,
      recentProjectIds: [],
    });

    await user.click(
      await screen.findByRole('button', { name: 'Open user menu' }),
    );
    expect(screen.getByText('Lin Chen')).toBeVisible();
    expect(screen.getByText('lin@forcetrack.local')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Light' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'System' }),
    ).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('lin@forcetrack.local')).not.toBeInTheDocument();
  });

  it('shows recovered storage feedback on every route and lets the user dismiss it', async () => {
    const user = userEvent.setup();
    renderApp(
      '/summary',
      {
        locale: 'en-US',
        theme: 'light',
        lastProjectId: null,
        recentProjectIds: [],
      },
      new RecoveryTaskRepository({
        kind: 'recovered',
        snapshot: makeSnapshot(),
      }),
    );

    expect(
      await screen.findByText(/restored the demo tasks/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Dismiss recovery message' }),
    );
    await user.click(screen.getByRole('link', { name: 'Timeline' }));

    expect(
      screen.queryByText(/restored the demo tasks/),
    ).not.toBeInTheDocument();
  });

  it('keeps an in-memory project usable when repository loading fails', async () => {
    renderApp(
      '/board',
      {
        locale: 'en-US',
        theme: 'light',
        lastProjectId: null,
        recentProjectIds: [],
      },
      new RecoveryTaskRepository(new Error('read failed')),
    );

    expect(
      await screen.findByText(/could not be saved to this browser/),
    ).toBeVisible();
    expect(await screen.findByText('ForceTrack Sprint 1')).toBeVisible();
    expect(screen.queryByText('Loading board…')).not.toBeInTheDocument();
  });

  it('keeps a new task visible while reporting a failed save', async () => {
    const user = userEvent.setup();
    renderApp(
      '/board',
      {
        locale: 'en-US',
        theme: 'light',
        lastProjectId: null,
        recentProjectIds: [],
      },
      new RecoveryTaskRepository(
        { kind: 'loaded', snapshot: makeSnapshot() },
        true,
      ),
    );

    await user.click(
      (await screen.findAllByRole('button', { name: 'New task' }))[0],
    );
    const dialog = screen.getByRole('dialog', { name: 'Create task' });
    await user.type(
      within(dialog).getByRole('textbox', { name: /Summary/ }),
      'In-memory task',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('In-memory task')).toBeVisible();
    expect(
      screen.getByText(/could not be saved to this browser/),
    ).toBeVisible();
  });
});
