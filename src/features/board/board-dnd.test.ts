import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { vi } from 'vitest';

import {
  boardKeyboardCoordinates,
  boardColumnId,
  insertionIndexFromCardMidpoints,
  normalizeBoardDropIndex,
  orderedTasksForStatus,
  resolveBoardDropTarget,
} from '@/features/board/board-dnd';
import { taskReducer } from '@/domain/task-reducer';
import { LATER_NOW, makeSnapshot, makeTask } from '@/test/fixtures';

const tasks = [
  makeTask({ id: 'todo-a', key: 'FT-1', status: 'todo', position: 0 }),
  makeTask({ id: 'todo-b', key: 'FT-2', status: 'todo', position: 1 }),
  makeTask({
    id: 'progress-a',
    key: 'FT-3',
    status: 'in_progress',
    position: 0,
  }),
];

type KeyboardArgs = Parameters<KeyboardCoordinateGetter>[1];

function keyboardArgs({
  overStatus,
  activeStatus = 'todo',
  collisionRect = { top: 40, left: 10, width: 80, height: 40 },
  includeTarget = true,
}: {
  overStatus?: unknown;
  activeStatus?: unknown;
  collisionRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  includeTarget?: boolean;
} = {}): KeyboardArgs {
  const targetRect = {
    top: 20,
    bottom: 180,
    left: 200,
    right: 400,
    width: 200,
    height: 160,
  };
  return {
    context: {
      active: { data: { current: { status: activeStatus } } },
      over:
        overStatus === undefined
          ? null
          : { data: { current: { status: overStatus } } },
      collisionRect: collisionRect
        ? {
            ...collisionRect,
            bottom: collisionRect.top + collisionRect.height,
            right: collisionRect.left + collisionRect.width,
          }
        : null,
      droppableRects: new Map(
        includeTarget ? [[boardColumnId('in_progress'), targetRect]] : [],
      ),
    },
  } as unknown as KeyboardArgs;
}

describe('Board drag-and-drop mapping', () => {
  it('maps a card target to its status and ordered insertion index', () => {
    expect(resolveBoardDropTarget(tasks, 'todo-b')).toEqual({
      status: 'todo',
      index: 1,
    });
    expect(resolveBoardDropTarget(tasks, 'progress-a')).toEqual({
      status: 'in_progress',
      index: 0,
    });
    expect(resolveBoardDropTarget(tasks, 'progress-a', 'after')).toEqual({
      status: 'in_progress',
      index: 1,
    });
  });

  it('normalizes same-column visual indices after removing the moving card', () => {
    expect(
      normalizeBoardDropIndex(tasks, 'todo-a', {
        status: 'todo',
        index: 2,
      }),
    ).toBe(1);
    expect(
      normalizeBoardDropIndex(tasks, 'todo-b', {
        status: 'todo',
        index: 0,
      }),
    ).toBe(0);
    expect(
      normalizeBoardDropIndex(tasks, 'missing', {
        status: 'todo',
        index: 1,
      }),
    ).toBe(1);
    expect(
      normalizeBoardDropIndex(tasks, 'todo-a', {
        status: 'done',
        index: 0,
      }),
    ).toBe(0);
  });

  it('moves keyboard drags horizontally and clamps their vertical coordinate', () => {
    const preventDefault = vi.fn();
    const event = {
      code: 'ArrowRight',
      preventDefault,
    } as unknown as KeyboardEvent;

    expect(boardKeyboardCoordinates(event, keyboardArgs())).toEqual({
      x: 260,
      y: 40,
    });
    expect(
      boardKeyboardCoordinates(
        event,
        keyboardArgs({
          collisionRect: { top: -20, left: 0, width: 80, height: 40 },
        }),
      ),
    ).toEqual({ x: 260, y: 20 });
    expect(
      boardKeyboardCoordinates(
        event,
        keyboardArgs({
          collisionRect: { top: 170, left: 0, width: 80, height: 40 },
        }),
      ),
    ).toEqual({ x: 260, y: 140 });
    expect(preventDefault).toHaveBeenCalledTimes(3);
  });

  it('falls back to active status and rejects incomplete keyboard targets', () => {
    const right = {
      code: 'ArrowRight',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    const left = {
      code: 'ArrowLeft',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    expect(
      boardKeyboardCoordinates(
        right,
        keyboardArgs({ overStatus: 'invalid', activeStatus: 'todo' }),
      ),
    ).toEqual({ x: 260, y: 40 });
    expect(
      boardKeyboardCoordinates(
        right,
        keyboardArgs({ overStatus: 'invalid', activeStatus: 'invalid' }),
      ),
    ).toBeUndefined();
    expect(
      boardKeyboardCoordinates(right, keyboardArgs({ collisionRect: null })),
    ).toBeUndefined();
    expect(
      boardKeyboardCoordinates(right, keyboardArgs({ includeTarget: false })),
    ).toBeUndefined();
    expect(
      boardKeyboardCoordinates(
        left,
        keyboardArgs({ overStatus: 'todo', activeStatus: 'todo' }),
      ),
    ).toBeUndefined();
  });

  it('resolves insertion gaps directly from card midpoints', () => {
    const midpoints = [120, 260, 400];
    expect(insertionIndexFromCardMidpoints(midpoints, 80)).toBe(0);
    expect(insertionIndexFromCardMidpoints(midpoints, 200)).toBe(1);
    expect(insertionIndexFromCardMidpoints(midpoints, 320)).toBe(2);
    expect(insertionIndexFromCardMidpoints(midpoints, 460)).toBe(3);
  });

  it('maps column targets to the end, including an empty column', () => {
    expect(resolveBoardDropTarget(tasks, boardColumnId('todo'))).toEqual({
      status: 'todo',
      index: 2,
    });
    expect(resolveBoardDropTarget(tasks, boardColumnId('done'))).toEqual({
      status: 'done',
      index: 0,
    });
    expect(resolveBoardDropTarget(tasks, 'unknown-target')).toBeNull();
  });

  it('feeds cross-column mappings into the reducer without loss or duplication', () => {
    const target = resolveBoardDropTarget(tasks, 'progress-a');
    expect(target).not.toBeNull();

    const result = taskReducer(makeSnapshot({ nextTaskNumber: 4, tasks }), {
      type: 'task/moved',
      payload: {
        taskId: 'todo-b',
        toStatus: target!.status,
        toIndex: target!.index,
        updatedAt: LATER_NOW,
      },
    });

    expect(result.tasks.map((task) => task.id).sort()).toEqual(
      tasks.map((task) => task.id).sort(),
    );
    expect(
      orderedTasksForStatus(result.tasks, 'in_progress').map((task) => task.id),
    ).toEqual(['todo-b', 'progress-a']);
    expect(orderedTasksForStatus(result.tasks, 'todo')).toEqual([
      expect.objectContaining({ id: 'todo-a', position: 0 }),
    ]);
  });
});
