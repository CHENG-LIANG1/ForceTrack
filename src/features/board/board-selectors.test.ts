import {
  selectActiveSprint,
  selectActiveSprintTasks,
} from '@/features/board/board-selectors';
import { makeSnapshot, makeTask } from '@/test/fixtures';

describe('board selectors', () => {
  it('selects only tasks in the single active sprint without mutating the snapshot', () => {
    const snapshot = makeSnapshot({
      nextTaskNumber: 4,
      tasks: [
        makeTask(),
        makeTask({
          id: 'backlog',
          key: 'FT-2',
          sprintId: null,
          position: 1,
          rank: 0,
        }),
        makeTask({ id: 'active-2', key: 'FT-3', position: 2, rank: 1 }),
      ],
    });
    const before = structuredClone(snapshot);
    expect(selectActiveSprint(snapshot)?.id).toBe('sprint-1');
    expect(selectActiveSprintTasks(snapshot).map((task) => task.id)).toEqual([
      'task-1',
      'active-2',
    ]);
    expect(snapshot).toEqual(before);
  });

  it('returns no tasks when there is no active sprint', () => {
    const snapshot = makeSnapshot({ sprints: [] });
    expect(selectActiveSprint(snapshot)).toBeNull();
    expect(selectActiveSprintTasks(snapshot)).toEqual([]);
  });
});
