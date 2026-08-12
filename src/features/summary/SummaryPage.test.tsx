/** Component acceptance for the seven Summary modules, shared filters, and task dialog reuse. */
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
import { makeSnapshot, makeTask } from '@/test/fixtures';

class MemoryTaskRepository implements TaskRepository {
  constructor(private readonly snapshot: TaskSnapshotV2) {}

  async load(): Promise<LoadResult> {
    return { kind: 'loaded', snapshot: structuredClone(this.snapshot) };
  }

  async save(): Promise<void> {}
}

const preferencesRepository: PreferencesRepository = {
  load: async (): Promise<UserPreferences> => ({
    locale: 'en-US',
    theme: 'light',
    lastProjectId: null,
    recentProjectIds: [],
  }),
  save: async () => undefined,
};

function renderSummary() {
  const epic = makeTask({
    id: 'epic',
    key: 'FT-1',
    title: 'Payments epic',
    workType: 'epic',
    assigneeId: 'member-1',
  });
  const bug = makeTask({
    id: 'bug',
    key: 'FT-2',
    title: 'Fix checkout',
    workType: 'bug',
    status: 'in_progress',
    priority: 'high',
    assigneeId: null,
    parentId: epic.id,
    rank: 1,
    position: 1,
  });
  window.history.replaceState({}, '', '/summary');
  render(
    <AppProviders
      preferencesRepository={preferencesRepository}
      taskRepository={
        new MemoryTaskRepository(
          makeSnapshot({ tasks: [epic, bug], nextTaskNumber: 3 }),
        )
      }
    >
      <App />
    </AppProviders>,
  );
}

describe('Summary page', () => {
  afterEach(() => cleanup());

  it('renders every derived module and opens the shared task dialog', async () => {
    const user = userEvent.setup();
    renderSummary();

    await screen.findByRole('heading', { name: 'Summary', level: 1 });
    for (const heading of [
      'Status overview',
      'Recent activity',
      'Priority breakdown',
      'Types of work',
      'Team workload',
      'Work progress',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    }
    expect(screen.getAllByText('Unassigned')).not.toHaveLength(0);
    expect(screen.getAllByText('Payments epic')).not.toHaveLength(0);
    expect(
      screen.getByRole('img', {
        name: /To do 1, In progress 1, In review 0, Done 0/i,
      }),
    ).toBeVisible();

    const recentActivity = screen
      .getByRole('heading', { name: 'Recent activity' })
      .closest('section');
    expect(recentActivity).not.toBeNull();
    await user.click(
      within(recentActivity as HTMLElement).getByRole('button', {
        name: /FT-2.*Fix checkout/,
      }),
    );
    expect(screen.getByRole('dialog', { name: 'Task details' })).toBeVisible();
  });

  it('applies one multi-dimensional result to all modules and clears it', async () => {
    const user = userEvent.setup();
    renderSummary();

    await user.click(await screen.findByRole('checkbox', { name: 'Bug' }));
    await user.click(screen.getByRole('checkbox', { name: 'High priority' }));

    const recentActivity = screen
      .getByRole('heading', { name: 'Recent activity' })
      .closest('section');
    expect(recentActivity).not.toBeNull();
    expect(
      within(recentActivity as HTMLElement).getByText('Fix checkout'),
    ).toBeVisible();
    expect(
      within(recentActivity as HTMLElement).queryByText('Payments epic'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No epics match this view yet.')).toBeVisible();
    expect(screen.getByText('2 active dimensions')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() =>
      expect(screen.getAllByText('Payments epic')).not.toHaveLength(0),
    );
    expect(screen.getByText('0 active dimensions')).toBeVisible();
  });
});
