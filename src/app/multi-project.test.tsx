import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import type { UserPreferences } from '@/domain/member';
import { wrapLegacySnapshot } from '@/domain/workspace';
import type {
  PreferencesRepository,
  WorkspaceLoadResult,
  WorkspaceRepository,
} from '@/infrastructure/repositories';
import { FIXED_NOW, makeDependencies, makeSnapshot } from '@/test/fixtures';

class MemoryWorkspaceRepository implements WorkspaceRepository {
  readonly saves: WorkspaceLoadResult['snapshot'][] = [];
  constructor(private snapshot: WorkspaceLoadResult['snapshot']) {}
  async load(): Promise<WorkspaceLoadResult> {
    return { kind: 'loaded', snapshot: this.snapshot };
  }
  async save(snapshot: WorkspaceLoadResult['snapshot']): Promise<void> {
    this.snapshot = snapshot;
    this.saves.push(snapshot);
  }
}

class MemoryPreferencesRepository implements PreferencesRepository {
  private preferences: UserPreferences = {
    locale: 'en-US',
    theme: 'light',
    lastProjectId: null,
    recentProjectIds: [],
  };
  async load() {
    return this.preferences;
  }
  async save(preferences: UserPreferences) {
    this.preferences = preferences;
  }
}

describe('multi-project workflow', () => {
  it('creates an isolated project and preserves the page while switching', async () => {
    const user = userEvent.setup();
    const repository = new MemoryWorkspaceRepository(
      wrapLegacySnapshot(makeSnapshot(), '2026-08-12T00:00:00.000Z'),
    );
    const generatedProjectId = `project-${Date.parse(FIXED_NOW)}`;
    const generatedProjectKey = `P${Date.parse(FIXED_NOW).toString(36).toUpperCase()}`;
    window.history.replaceState({}, '', '/projects/project-forcetrack/summary');
    render(
      <AppProviders
        workspaceRepository={repository}
        preferencesRepository={new MemoryPreferencesRepository()}
        taskDependencies={makeDependencies([
          'project-game',
          'owner-game',
          'task-game',
        ])}
      >
        <App />
      </AppProviders>,
    );

    await user.click(
      await screen.findByRole('button', { name: /Switch project/ }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Project management' }),
    );
    const managementDialog = screen.getByRole('dialog', {
      name: 'Project management',
    });
    await user.click(
      within(managementDialog).getByRole('button', { name: 'Create project' }),
    );
    const createDialog = screen.getByRole('dialog', { name: 'Create project' });
    await user.type(
      within(createDialog).getByLabelText('Project name'),
      'Game Platform',
    );
    expect(
      within(createDialog).queryByLabelText(/^Project key/),
    ).not.toBeInTheDocument();
    await user.click(
      within(createDialog).getByRole('button', { name: 'Create project' }),
    );

    await waitFor(() =>
      expect(window.location.pathname).toBe(
        `/projects/${generatedProjectId}/summary`,
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Project management' }),
      ).toBeInTheDocument(),
    );
    expect(repository.saves.at(-1)?.projects[1]).toMatchObject({
      id: generatedProjectId,
      key: generatedProjectKey,
      name: 'Game Platform',
      tasks: [],
    });
    expect(repository.saves.at(-1)?.projects[0].tasks).toHaveLength(2);

    await user.click(
      screen.getByRole('button', { name: 'Close project management' }),
    );

    await user.click(screen.getByRole('button', { name: /Switch project/ }));
    await user.click(screen.getByRole('option', { name: /ForceTrack.*FT/ }));
    expect(window.location.pathname).toBe(
      '/projects/project-forcetrack/summary',
    );
  }, 10_000);

  it('requires the current project name, then guides creation from an empty workspace', async () => {
    const user = userEvent.setup();
    const repository = new MemoryWorkspaceRepository(
      wrapLegacySnapshot(makeSnapshot(), '2026-08-12T00:00:00.000Z'),
    );
    window.history.replaceState({}, '', '/projects/project-forcetrack/summary');
    render(
      <AppProviders
        workspaceRepository={repository}
        preferencesRepository={new MemoryPreferencesRepository()}
        taskDependencies={makeDependencies(['replacement-owner'])}
      >
        <App />
      </AppProviders>,
    );

    await user.click(
      await screen.findByRole('button', { name: /Switch project/ }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Project management' }),
    );
    const managementDialog = screen.getByRole('dialog', {
      name: 'Project management',
    });
    const currentDelete = within(managementDialog).getByRole('button', {
      name: 'Delete project ForceTrack',
    });
    expect(currentDelete).toBeEnabled();
    await user.click(currentDelete);

    const confirmation = screen.getByRole('alertdialog', {
      name: 'Delete project?',
    });
    const confirmationName = within(confirmation).getByLabelText(
      'Type ForceTrack to confirm',
    );
    const deleteButton = within(confirmation).getByRole('button', {
      name: 'Delete permanently',
    });
    expect(confirmationName).toHaveFocus();
    expect(deleteButton).toBeDisabled();
    await user.type(confirmationName, 'ForceTrac');
    expect(deleteButton).toBeDisabled();
    await user.type(confirmationName, 'k');
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);

    await waitFor(() => expect(repository.saves.at(-1)?.projects).toEqual([]));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(
      screen.getByRole('heading', {
        name: 'Create your first project',
        level: 1,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Create project' }));
    const createDialog = screen.getByRole('dialog', {
      name: 'Create project',
    });
    await user.type(
      within(createDialog).getByLabelText('Project name'),
      'Replacement Project',
    );
    await user.click(
      within(createDialog).getByRole('button', { name: 'Create project' }),
    );

    await waitFor(() =>
      expect(window.location.pathname).toMatch(
        /^\/projects\/project-\d+\/summary$/,
      ),
    );
    expect(repository.saves.at(-1)?.projects).toEqual([
      expect.objectContaining({ name: 'Replacement Project' }),
    ]);
  }, 10_000);
});
