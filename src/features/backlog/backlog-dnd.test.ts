import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';

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

  it('moves keyboard drags between planning sections', () => {
    type KeyboardArgs = Parameters<KeyboardCoordinateGetter>[1];
    const getter = createBacklogKeyboardCoordinates(['sprint-1', null]);
    const event = {
      code: 'ArrowDown',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    const targetRect = {
      top: 200,
      bottom: 500,
      left: 40,
      right: 440,
      width: 400,
      height: 300,
    };
    const collisionRect = {
      top: 80,
      bottom: 120,
      left: 100,
      right: 300,
      width: 200,
      height: 40,
    };
    const args = {
      context: {
        over: { data: { current: { sprintId: 'sprint-1' } } },
        active: { data: { current: { sprintId: 'sprint-1' } } },
        droppableRects: new Map([[backlogSectionId(null), targetRect]]),
        collisionRect,
      },
    } as unknown as KeyboardArgs;

    expect(getter(event, args)).toEqual({ x: 140, y: 208 });
    expect(event.preventDefault).toHaveBeenCalledOnce();

    const upward = createBacklogKeyboardCoordinates(['sprint-1', null]);
    const upEvent = {
      code: 'ArrowUp',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    const upArgs = {
      context: {
        over: null,
        active: { data: { current: { sprintId: null } } },
        droppableRects: new Map([[backlogSectionId('sprint-1'), targetRect]]),
        collisionRect,
      },
    } as unknown as KeyboardArgs;
    expect(upward(upEvent, upArgs)).toEqual({ x: 140, y: 452 });
  });

  it('rejects unsupported or incomplete keyboard moves', () => {
    type KeyboardArgs = Parameters<KeyboardCoordinateGetter>[1];
    const getter = createBacklogKeyboardCoordinates(['sprint-1', null]);
    const baseContext = {
      over: { data: { current: { sprintId: 'sprint-1' } } },
      active: { data: { current: { sprintId: 'sprint-1' } } },
      droppableRects: new Map(),
      collisionRect: null,
    };
    const args = { context: baseContext } as unknown as KeyboardArgs;

    expect(getter({ code: 'Enter' } as KeyboardEvent, args)).toBeUndefined();
    expect(
      getter(
        { code: 'ArrowUp' } as KeyboardEvent,
        {
          context: {
            ...baseContext,
            over: { data: { current: { sprintId: undefined } } },
            active: { data: { current: { sprintId: undefined } } },
          },
        } as unknown as KeyboardArgs,
      ),
    ).toBeUndefined();
    expect(getter({ code: 'ArrowUp' } as KeyboardEvent, args)).toBeUndefined();
    expect(
      getter(
        { code: 'ArrowDown' } as KeyboardEvent,
        {
          context: {
            ...baseContext,
            collisionRect: {
              top: 0,
              bottom: 40,
              left: 0,
              right: 100,
              width: 100,
              height: 40,
            },
          },
        } as unknown as KeyboardArgs,
      ),
    ).toBeUndefined();
  });

  it('inserts before or after a target row in the same section', () => {
    const ordered = [
      makeTask({ id: 'first', rank: 0 }),
      makeTask({ id: 'middle', key: 'FT-2', rank: 1 }),
      makeTask({ id: 'last', key: 'FT-3', rank: 2 }),
    ];

    expect(
      resolveBacklogMoveTarget(ordered, 'last', 'first', 'before'),
    ).toEqual({
      sprintId: 'sprint-1',
      toIndex: 0,
    });
    expect(resolveBacklogMoveTarget(ordered, 'first', 'last', 'after')).toEqual(
      {
        sprintId: 'sprint-1',
        toIndex: 2,
      },
    );
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
      resolveBacklogMoveTarget(
        allTasks,
        backlogTask.id,
        visibleTarget.id,
        'after',
      ),
    ).toEqual({ sprintId: 'sprint-2', toIndex: 2 });
    expect(
      resolveBacklogMoveTarget(
        allTasks,
        backlogTask.id,
        backlogSectionId('empty-sprint'),
      ),
    ).toEqual({ sprintId: 'empty-sprint', toIndex: 0 });
  });
});
