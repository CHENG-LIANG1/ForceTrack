import { describe, expect, it } from 'vitest';

import {
  backlogSectionId,
  createBacklogKeyboardCoordinates,
  resolveBacklogDropTarget,
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
});
