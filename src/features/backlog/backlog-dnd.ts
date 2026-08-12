import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

import type { Task } from '@/domain/task';

const SECTION_ID_PREFIX = 'backlog-section:';
const BACKLOG_SECTION_VALUE = '__backlog__';

export interface BacklogDropTarget {
  sprintId: string | null;
}

export interface BacklogMoveTarget extends BacklogDropTarget {
  toIndex: number;
}

export function backlogSectionId(sprintId: string | null): string {
  return `${SECTION_ID_PREFIX}${sprintId ?? BACKLOG_SECTION_VALUE}`;
}

/** Moves a keyboard-dragged row vertically between sprint planning sections. */
export function createBacklogKeyboardCoordinates(
  sectionSprintIds: readonly (string | null)[],
): KeyboardCoordinateGetter {
  return (event, args) => {
    if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') {
      return undefined;
    }

    const data =
      args.context.over?.data.current ?? args.context.active?.data.current;
    const currentSprintId = data?.sprintId;
    if (typeof currentSprintId !== 'string' && currentSprintId !== null) {
      return undefined;
    }

    const currentIndex = sectionSprintIds.indexOf(currentSprintId);
    const targetIndex = currentIndex + (event.code === 'ArrowDown' ? 1 : -1);
    const targetSprintId = sectionSprintIds[targetIndex];
    if (targetSprintId === undefined) return undefined;

    const targetRect = args.context.droppableRects.get(
      backlogSectionId(targetSprintId),
    );
    const collisionRect = args.context.collisionRect;
    if (!targetRect || !collisionRect) return undefined;

    event.preventDefault();
    return {
      x: targetRect.left + (targetRect.width - collisionRect.width) / 2,
      y:
        event.code === 'ArrowUp'
          ? targetRect.bottom - collisionRect.height - 8
          : targetRect.top + 8,
    };
  };
}

function sprintIdFromSectionId(id: string): string | null | undefined {
  if (!id.startsWith(SECTION_ID_PREFIX)) return undefined;
  const value = id.slice(SECTION_ID_PREFIX.length);
  return value === BACKLOG_SECTION_VALUE ? null : value;
}

/** Resolves both section backgrounds and work-item rows to a planning target. */
export function resolveBacklogDropTarget(
  tasks: readonly Task[],
  overId: string,
): BacklogDropTarget | null {
  const sectionSprintId = sprintIdFromSectionId(overId);
  if (sectionSprintId !== undefined) {
    return { sprintId: sectionSprintId };
  }

  const targetTask = tasks.find((task) => task.id === overId);
  return targetTask ? { sprintId: targetTask.sprintId } : null;
}

/** Maps a row or section drop to the full, unfiltered planning order. */
export function resolveBacklogMoveTarget(
  tasks: readonly Task[],
  movingTaskId: string,
  overId: string,
): BacklogMoveTarget | null {
  const movingTask = tasks.find((task) => task.id === movingTaskId);
  const target = resolveBacklogDropTarget(tasks, overId);
  if (!movingTask || !target) return null;

  const orderedTargetTasks = tasks
    .filter((task) => task.sprintId === target.sprintId)
    .sort(
      (left, right) =>
        left.rank - right.rank || left.id.localeCompare(right.id),
    );
  const overTaskIndex = orderedTargetTasks.findIndex(
    (task) => task.id === overId,
  );

  return {
    sprintId: target.sprintId,
    toIndex:
      overTaskIndex >= 0
        ? overTaskIndex
        : orderedTargetTasks.filter((task) => task.id !== movingTask.id).length,
  };
}
