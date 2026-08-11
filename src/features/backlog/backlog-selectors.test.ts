import {
  selectBacklogSections,
  selectPlanningSprints,
  selectTasksForPlanningSection,
} from '@/features/backlog/backlog-selectors';
import { makeSnapshot, makeTask } from '@/test/fixtures';

describe('backlog selectors', () => {
  it('puts the active sprint first, future sprints by position, and backlog last', () => {
    const active = makeSnapshot().sprints[0];
    const planned = {
      ...active,
      id: 'planned',
      status: 'planned' as const,
      position: 1,
      startedAt: null,
      startDate: null,
      endDate: null,
    };
    const snapshot = makeSnapshot({
      sprints: [planned, active],
      nextTaskNumber: 4,
      tasks: [
        makeTask({ id: 'active-b', key: 'FT-1', rank: 1 }),
        makeTask({ id: 'active-a', key: 'FT-2', position: 1, rank: 0 }),
        makeTask({
          id: 'backlog',
          key: 'FT-3',
          position: 2,
          sprintId: null,
          rank: 0,
        }),
      ],
    });
    const before = structuredClone(snapshot);

    expect(selectPlanningSprints(snapshot).map((sprint) => sprint.id)).toEqual([
      active.id,
      planned.id,
    ]);
    expect(
      selectBacklogSections(snapshot).map(
        (section) => section.sprint?.id ?? null,
      ),
    ).toEqual([active.id, planned.id, null]);
    expect(
      selectTasksForPlanningSection(snapshot.tasks, active.id).map(
        (task) => task.id,
      ),
    ).toEqual(['active-a', 'active-b']);
    expect(snapshot).toEqual(before);
  });
});
