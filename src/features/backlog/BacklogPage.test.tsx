import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import type { UserPreferences } from '@/domain/member';
import type { TaskSnapshotV2 } from '@/domain/task';
import type {
  LoadResult,
  PreferencesRepository,
  TaskRepository,
} from '@/infrastructure/repositories';
import { makeDependencies, makeSnapshot } from '@/test/fixtures';

class MemoryTaskRepository implements TaskRepository {
  readonly saves: TaskSnapshotV2[] = [];

  constructor(private snapshot: TaskSnapshotV2) {}

  async load(): Promise<LoadResult> {
    return { kind: 'loaded', snapshot: structuredClone(this.snapshot) };
  }

  async save(snapshot: TaskSnapshotV2): Promise<void> {
    this.snapshot = structuredClone(snapshot);
    this.saves.push(structuredClone(snapshot));
  }
}

const preferencesRepository: PreferencesRepository = {
  load: async (): Promise<UserPreferences> => ({
    locale: 'en-US',
    theme: 'light',
  }),
  save: async () => undefined,
};

function renderBacklog(
  ids: readonly string[] = ['new-sprint', 'new-member'],
  snapshot: TaskSnapshotV2 = makeSnapshot({ tasks: [], nextTaskNumber: 1 }),
) {
  window.history.replaceState({}, '', '/backlog');
  const repository = new MemoryTaskRepository(snapshot);
  render(
    <AppProviders
      preferencesRepository={preferencesRepository}
      taskRepository={repository}
      taskDependencies={makeDependencies(ids)}
    >
      <App />
    </AppProviders>,
  );
  return repository;
}

describe('Backlog planning', () => {
  afterEach(() => cleanup());

  it('creates a planned sprint and persists it as a backlog section', async () => {
    const user = userEvent.setup();
    const repository = renderBacklog(['new-sprint']);

    await user.click(
      await screen.findByRole('button', { name: 'Create sprint' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Create sprint' });
    await user.type(within(dialog).getByLabelText(/Sprint name/), 'Sprint 2');
    await user.type(
      within(dialog).getByLabelText('Sprint goal'),
      'Finish the reporting flow',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create sprint' }),
    );

    await waitFor(() => expect(repository.saves).toHaveLength(1));
    expect(repository.saves[0].sprints).toContainEqual(
      expect.objectContaining({
        id: 'new-sprint',
        name: 'Sprint 2',
        goal: 'Finish the reporting flow',
        status: 'planned',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'Sprint 2' }),
    ).toBeInTheDocument();
  });

  it('adds and persists a member for task assignment', async () => {
    const user = userEvent.setup();
    const repository = renderBacklog(['new-member']);

    await user.click(await screen.findByRole('button', { name: 'Add member' }));
    const memberDialog = screen.getByRole('dialog', { name: 'Add member' });
    await user.type(within(memberDialog).getByLabelText(/Name/), 'Grace Kim');
    await user.type(
      within(memberDialog).getByLabelText(/Email/),
      'grace@example.com',
    );
    await user.click(
      within(memberDialog).getByRole('button', { name: 'Add member' }),
    );

    await waitFor(() => expect(repository.saves).toHaveLength(1));
    expect(repository.saves[0].members).toContainEqual({
      id: 'new-member',
      name: 'Grace Kim',
      email: 'grace@example.com',
      createdAt: '2026-08-11T08:00:00.000Z',
    });
  });

  it('disables starting an empty planned sprint', async () => {
    const planned = {
      ...makeSnapshot().sprints[0],
      id: 'sprint-2',
      name: 'Sprint 2',
      startDate: null,
      endDate: null,
      status: 'planned' as const,
    };
    renderBacklog([], makeSnapshot({ tasks: [], sprints: [planned] }));

    expect(
      await screen.findByRole('button', { name: 'Start sprint' }),
    ).toBeDisabled();
  });

  it('starts a populated sprint with editable details and default dates', async () => {
    const user = userEvent.setup();
    const base = makeSnapshot();
    const planned = {
      ...base.sprints[0],
      id: 'sprint-2',
      name: 'Sprint 2',
      goal: '',
      startDate: null,
      endDate: null,
      status: 'planned' as const,
      startedAt: null,
    };
    const repository = renderBacklog(
      [],
      makeSnapshot({
        tasks: [
          {
            ...base.tasks[0],
            sprintId: planned.id,
          },
        ],
        sprints: [planned],
      }),
    );

    await user.click(
      await screen.findByRole('button', { name: 'Start sprint' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Start sprint' });
    await user.clear(within(dialog).getByLabelText(/Sprint name/));
    await user.type(within(dialog).getByLabelText(/Sprint name/), 'Launch');
    await user.type(within(dialog).getByLabelText('Sprint goal'), 'Ship it');
    await user.click(
      within(dialog).getByRole('button', { name: 'Start sprint' }),
    );

    await waitFor(() => expect(repository.saves).toHaveLength(1));
    expect(repository.saves[0].sprints[0]).toMatchObject({
      name: 'Launch',
      goal: 'Ship it',
      status: 'active',
    });
    expect(repository.saves[0].sprints[0].startDate).not.toBeNull();
    expect(repository.saves[0].sprints[0].endDate).not.toBeNull();
    expect(window.location.pathname).toBe('/board');
    expect(screen.getByText('Launch')).toBeVisible();
    expect(screen.getByText('Ship it')).toBeVisible();
  });

  it('completes an active sprint and persists its lifecycle state', async () => {
    const user = userEvent.setup();
    const repository = renderBacklog();

    await user.click(
      await screen.findByRole('button', { name: 'Complete sprint' }),
    );
    const dialog = screen.getByRole('alertdialog', {
      name: 'Complete sprint',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Complete' }));

    await waitFor(() => expect(repository.saves).toHaveLength(1));
    expect(repository.saves[0].sprints[0].status).toBe('completed');
  });

  it('disables starting a planned sprint while another sprint is active', async () => {
    const planned = {
      ...makeSnapshot().sprints[0],
      id: 'sprint-2',
      name: 'Sprint 2',
      status: 'planned' as const,
    };
    renderBacklog(
      [],
      makeSnapshot({
        tasks: [],
        sprints: [...makeSnapshot().sprints, planned],
      }),
    );

    expect(
      await screen.findByRole('button', { name: 'Start sprint' }),
    ).toBeDisabled();
  });
});
