import { describe, expect, it } from 'vitest';

import {
  backlogSectionId,
  createBacklogKeyboardCoordinates,
  resolveBacklogDropTarget,
  resolveBacklogMoveTarget,
} from '@/features/backlog/backlog-dnd';
import { makeTask } from '@/test/fixtures';

describe('backlog drag targets', () => {
  const sprintTask = makeTask({ id: 'sprint-task', sprintId: 'sprint-1' });
  const backlogTask = makeTask({ id: 'backlog-task', sprintId: null });
  const tasks = [sprintTask, backlogTask];

  it('resolves sprint and backlog section backgrounds', () => {
    expect(
      resolveBacklogDropTarget(tasks, backlogSectionId('sprint-2')),
    ).toEqual({ sprintId: 'sprint-2' });
    expect(resolveBacklogDropTarget(tasks, backlogSectionId(null))).toEqual({
      sprintId: null,
    });
  });

  it('uses the target row container when dropping on another work item', () => {
    expect(resolveBacklogDropTarget(tasks, sprintTask.id)).toEqual({
      sprintId: 'sprint-1',
    });
    expect(resolveBacklogDropTarget(tasks, backlogTask.id)).toEqual({
      sprintId: null,
    });
  });

  it('ignores unknown drop targets', () => {
    expect(resolveBacklogDropTarget(tasks, 'missing')).toBeNull();
  });

  it('builds a keyboard coordinate getter for planning section order', () => {
    expect(createBacklogKeyboardCoordinates(['sprint-1', null])).toBeTypeOf(
      'function',
    );
  });

  it('keeps the original target index when sorting downward in one section', () => {
    const ordered = [
      makeTask({ id: 'first', rank: 0 }),
      makeTask({ id: 'middle', key: 'FT-2', rank: 1 }),
      makeTask({ id: 'last', key: 'FT-3', rank: 2 }),
    ];

    expect(resolveBacklogMoveTarget(ordered, 'first', 'last')).toEqual({
      sprintId: 'sprint-1',
      toIndex: 2,
    });
  });

  it('uses full unfiltered order for cross-section and empty-section drops', () => {
    const hiddenTarget = makeTask({
      id: 'hidden-target',
      key: 'FT-3',
      sprintId: 'sprint-2',
      rank: 0,
    });
    const visibleTarget = makeTask({
      id: 'visible-target',
      key: 'FT-4',
      sprintId: 'sprint-2',
      rank: 1,
    });
    const allTasks = [...tasks, hiddenTarget, visibleTarget];

    expect(
      resolveBacklogMoveTarget(allTasks, backlogTask.id, visibleTarget.id),
    ).toEqual({ sprintId: 'sprint-2', toIndex: 1 });
    expect(
      resolveBacklogMoveTarget(
        allTasks,
        backlogTask.id,
        backlogSectionId('empty-sprint'),
      ),
    ).toEqual({ sprintId: 'empty-sprint', toIndex: 0 });
  });
});
