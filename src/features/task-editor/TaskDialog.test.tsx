import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import type { UserPreferences } from '@/domain/member';
import type { TaskSnapshotV1 } from '@/domain/task';
import type {
  LoadResult,
  PreferencesRepository,
  TaskRepository,
} from '@/infrastructure/repositories';
import {
  FIXED_NOW,
  makeDependencies,
  makeSnapshot,
  makeTask,
  testMembers,
} from '@/test/fixtures';

class MemoryTaskRepository implements TaskRepository {
  readonly saves: TaskSnapshotV1[] = [];

  constructor(private snapshot: TaskSnapshotV1) {}

  async load(): Promise<LoadResult> {
    return { kind: 'loaded', snapshot: structuredClone(this.snapshot) };
  }

  async save(snapshot: TaskSnapshotV1): Promise<void> {
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

function renderEditor(snapshot: TaskSnapshotV1) {
  window.history.replaceState({}, '', '/board');
  const repository = new MemoryTaskRepository(snapshot);
  render(
    <AppProviders
      preferencesRepository={preferencesRepository}
      taskRepository={repository}
      taskDependencies={makeDependencies(['new-task-id'], FIXED_NOW)}
    >
      <App />
    </AppProviders>,
  );
  return repository;
}

describe('TaskDialog CRUD flow', () => {
  it('creates a validated task and persists the resulting snapshot', async () => {
    const user = userEvent.setup();
    const repository = renderEditor(
      makeSnapshot({ tasks: [], nextTaskNumber: 1, members: testMembers }),
    );

    const createButton = await screen.findByRole('button', {
      name: 'New task',
    });
    await user.click(createButton);

    const dialog = screen.getByRole('dialog', { name: 'Create task' });
    const titleInput = within(dialog).getByRole('textbox', { name: /Title/ });
    expect(titleInput).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Save task' }));
    expect(screen.getByText('Enter a task title.')).toBeInTheDocument();
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveFocus();

    await user.type(titleInput, 'Ship keyboard task flow');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Status' }),
      'in_progress',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

    await waitFor(() => expect(repository.saves).toHaveLength(1));
    expect(repository.saves[0]).toMatchObject({ nextTaskNumber: 2 });
    expect(repository.saves[0].tasks).toEqual([
      expect.objectContaining({
        id: 'new-task-id',
        key: 'FT-1',
        title: 'Ship keyboard task flow',
        status: 'in_progress',
      }),
    ]);
    expect(
      screen.queryByRole('dialog', { name: 'Create task' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Edit FT-1: Ship keyboard task flow',
      }),
    ).toBeInTheDocument();
  });

  it('rejects an inverted date range and focuses the due date', async () => {
    const user = userEvent.setup();
    renderEditor(makeSnapshot({ tasks: [], members: testMembers }));

    await user.click(await screen.findByRole('button', { name: 'New task' }));
    const dialog = screen.getByRole('dialog', { name: 'Create task' });
    await user.type(
      within(dialog).getByRole('textbox', { name: /Title/ }),
      'Schedule launch',
    );
    await user.type(within(dialog).getByLabelText('Start date'), '2026-08-20');
    const dueDate = within(dialog).getByLabelText('Due date');
    await user.type(dueDate, '2026-08-19');
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

    expect(
      screen.getByText('Due date cannot be earlier than start date.'),
    ).toBeInTheDocument();
    expect(dueDate).toHaveFocus();
  });

  it('enforces title and description length limits before saving', async () => {
    const user = userEvent.setup();
    const repository = renderEditor(
      makeSnapshot({ tasks: [], members: testMembers }),
    );

    await user.click(await screen.findByRole('button', { name: 'New task' }));
    const dialog = screen.getByRole('dialog', { name: 'Create task' });
    const title = within(dialog).getByRole('textbox', { name: /Title/ });
    const description = within(dialog).getByRole('textbox', {
      name: /Description/,
    });
    fireEvent.change(title, { target: { value: 'T'.repeat(101) } });
    fireEvent.change(description, { target: { value: 'D'.repeat(2_001) } });

    await user.click(within(dialog).getByRole('button', { name: 'Save task' }));
    expect(
      screen.getByText('Keep the title to 100 characters or fewer.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keep the description to 2,000 characters or fewer.'),
    ).toBeInTheDocument();
    expect(title).toHaveFocus();
    expect(repository.saves).toHaveLength(0);
  });

  it('guards Escape with a discard dialog and restores trigger focus', async () => {
    const user = userEvent.setup();
    renderEditor(makeSnapshot({ tasks: [], members: testMembers }));

    const createButton = await screen.findByRole('button', {
      name: 'New task',
    });
    await user.click(createButton);
    const titleInput = screen.getByRole('textbox', { name: /Title/ });

    await user.tab({ shift: true });
    expect(
      screen.getByRole('button', { name: 'Close task editor' }),
    ).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save task' })).toHaveFocus();

    await user.click(titleInput);
    await user.type(titleInput, 'Unsaved work');
    await user.keyboard('{Escape}');

    const confirmation = screen.getByRole('alertdialog', {
      name: 'Discard unsaved changes?',
    });
    await user.click(
      within(confirmation).getByRole('button', { name: 'Keep editing' }),
    );
    expect(titleInput).toHaveValue('Unsaved work');

    await user.keyboard('{Escape}');
    await user.click(
      within(
        screen.getByRole('alertdialog', {
          name: 'Discard unsaved changes?',
        }),
      ).getByRole('button', { name: 'Discard changes' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Create task' }),
      ).not.toBeInTheDocument(),
    );
    expect(createButton).toHaveFocus();
  });

  it('updates status and deletes the task only after confirmation', async () => {
    const user = userEvent.setup();
    const task = makeTask({ title: 'Review release', status: 'todo' });
    const repository = renderEditor(
      makeSnapshot({ tasks: [task], members: testMembers }),
    );

    await user.click(
      await screen.findByRole('button', { name: 'Edit FT-1: Review release' }),
    );
    let dialog = screen.getByRole('dialog', { name: 'Task details' });
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Status' }),
      'done',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }));
    await waitFor(() => expect(repository.saves).toHaveLength(1));
    expect(repository.saves[0].tasks[0].status).toBe('done');

    await user.click(
      screen.getByRole('button', { name: 'Edit FT-1: Review release' }),
    );
    dialog = screen.getByRole('dialog', { name: 'Task details' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete task' }),
    );
    expect(repository.saves).toHaveLength(1);

    const confirmation = screen.getByRole('alertdialog', {
      name: 'Delete this task?',
    });
    await user.click(
      within(confirmation).getByRole('button', { name: 'Delete permanently' }),
    );

    await waitFor(() => expect(repository.saves).toHaveLength(2));
    expect(repository.saves[1].tasks).toEqual([]);
    expect(screen.getAllByText('No tasks in this stage.')).toHaveLength(4);
  });
});
