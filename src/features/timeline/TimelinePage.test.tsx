/** Component acceptance for Timeline positioning, overdue/unscheduled states, and task dialog reuse. */
import { addDays } from 'date-fns';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import type { UserPreferences } from '@/domain/member';
import type { TaskSnapshotV2 } from '@/domain/task';
import { formatCalendarDate } from '@/features/timeline/timeline-selectors';
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
  }),
  save: async () => undefined,
};

function renderTimeline() {
  const now = new Date();
  const scheduled = makeTask({
    id: 'scheduled',
    key: 'FT-1',
    title: 'Overdue delivery',
    status: 'in_progress',
    startDate: formatCalendarDate(addDays(now, -2)),
    dueDate: formatCalendarDate(addDays(now, -1)),
  });
  const unscheduled = makeTask({
    id: 'unscheduled',
    key: 'FT-2',
    title: 'Undated discovery',
    startDate: null,
    dueDate: null,
    rank: 1,
    position: 1,
  });
  window.history.replaceState({}, '', '/timeline');
  render(
    <AppProviders
      preferencesRepository={preferencesRepository}
      taskRepository={
        new MemoryTaskRepository(
          makeSnapshot({ tasks: [scheduled, unscheduled], nextTaskNumber: 3 }),
        )
      }
    >
      <App />
    </AppProviders>,
  );
}

describe('Timeline page', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    cleanup();
    scrollIntoView.mockReset();
  });

  it('shows dated, overdue, and unscheduled work and centers Today', async () => {
    const user = userEvent.setup();
    renderTimeline();

    await screen.findByRole('heading', { name: 'Timeline', level: 1 });
    expect(screen.getByText('Overdue')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Unscheduled work' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: /FT-2.*Undated discovery/ }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  });

  it('opens the shared task dialog from the unscheduled area', async () => {
    const user = userEvent.setup();
    renderTimeline();

    await user.click(
      await screen.findByRole('button', {
        name: /FT-2.*Undated discovery/,
      }),
    );
    expect(screen.getByRole('dialog', { name: 'Task details' })).toBeVisible();
  });
});
