import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { TASK_STATUSES, type Task, type TaskStatus } from '@/domain/task';

const COLUMN_ID_PREFIX = 'board-column:';

export interface BoardDropTarget {
  status: TaskStatus;
  index: number;
}

export type BoardDropEdge = 'before' | 'after';

export function boardColumnId(status: TaskStatus): string {
  return `${COLUMN_ID_PREFIX}${status}`;
}

function statusFromColumnId(id: string): TaskStatus | null {
  if (!id.startsWith(COLUMN_ID_PREFIX)) return null;
  const status = id.slice(COLUMN_ID_PREFIX.length);
  return TASK_STATUSES.find((candidate) => candidate === status) ?? null;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.some((status) => status === value);
}

/** Crosses status columns horizontally while delegating vertical sorting to dnd-kit. */
export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  args,
) => {
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') {
    return sortableKeyboardCoordinates(event, args);
  }

  event.preventDefault();
  const overStatus = args.context.over?.data.current?.status;
  const activeStatus = args.context.active?.data.current?.status;
  const currentStatus = isTaskStatus(overStatus)
    ? overStatus
    : isTaskStatus(activeStatus)
      ? activeStatus
      : null;
  if (!currentStatus || !args.context.collisionRect) return undefined;

  const currentIndex = TASK_STATUSES.indexOf(currentStatus);
  const targetIndex = currentIndex + (event.code === 'ArrowRight' ? 1 : -1);
  const targetStatus = TASK_STATUSES[targetIndex];
  if (!targetStatus) return undefined;

  const targetRect = args.context.droppableRects.get(
    boardColumnId(targetStatus),
  );
  if (!targetRect) return undefined;

  const collisionRect = args.context.collisionRect;
  return {
    x: targetRect.left + (targetRect.width - collisionRect.width) / 2,
    y: Math.max(
      targetRect.top,
      Math.min(collisionRect.top, targetRect.bottom - collisionRect.height),
    ),
  };
};

export function orderedTasksForStatus(
  tasks: readonly Task[],
  status: TaskStatus,
): Task[] {
  return tasks
    .filter((task) => task.status === status)
    .sort((left, right) => left.position - right.position);
}

/** Resolves a stable gap even while the rendered placeholder temporarily owns the pointer. */
export function insertionIndexFromCardMidpoints(
  cardMidpoints: readonly number[],
  pointerY: number,
): number {
  const index = cardMidpoints.findIndex((midpoint) => pointerY < midpoint);
  return index === -1 ? cardMidpoints.length : index;
}

/** Maps either a task card or an empty-column droppable to a reducer insertion. */
export function resolveBoardDropTarget(
  tasks: readonly Task[],
  overId: string,
  edge: BoardDropEdge = 'before',
): BoardDropTarget | null {
  const columnStatus = statusFromColumnId(overId);
  if (columnStatus) {
    return {
      status: columnStatus,
      index: orderedTasksForStatus(tasks, columnStatus).length,
    };
  }

  const targetTask = tasks.find((task) => task.id === overId);
  if (!targetTask) return null;

  return {
    status: targetTask.status,
    index:
      orderedTasksForStatus(tasks, targetTask.status).findIndex(
        (task) => task.id === targetTask.id,
      ) + (edge === 'after' ? 1 : 0),
  };
}

/** Converts a visual insertion index into the post-removal index expected by the reducer. */
export function normalizeBoardDropIndex(
  tasks: readonly Task[],
  movingTaskId: string,
  target: BoardDropTarget,
): number {
  const movingTask = tasks.find((task) => task.id === movingTaskId);
  if (!movingTask || movingTask.status !== target.status) return target.index;

  const sourceIndex = orderedTasksForStatus(tasks, movingTask.status).findIndex(
    (task) => task.id === movingTaskId,
  );
  return sourceIndex >= 0 && sourceIndex < target.index
    ? target.index - 1
    : target.index;
}
