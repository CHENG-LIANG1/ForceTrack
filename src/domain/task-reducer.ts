import type { TaskAction } from '@/domain/actions';
import {
  TASK_STATUSES,
  type Task,
  type TaskSnapshotV1,
  type TaskStatus,
} from '@/domain/task';

function tasksInStatus(tasks: readonly Task[], status: TaskStatus): Task[] {
  return tasks
    .filter((task) => task.status === status)
    .sort((left, right) => left.position - right.position);
}

function replaceOrderedStatuses(
  tasks: readonly Task[],
  orderedByStatus: ReadonlyMap<TaskStatus, readonly Task[]>,
): Task[] {
  const replacements = new Map<string, Task>();

  for (const [status, orderedTasks] of orderedByStatus) {
    orderedTasks.forEach((task, position) => {
      replacements.set(task.id, { ...task, status, position });
    });
  }

  return tasks.map((task) => replacements.get(task.id) ?? task);
}

export function normalizeTaskPositions(tasks: readonly Task[]): Task[] {
  const seenIds = new Set<string>();
  const uniqueTasks = tasks.filter((task) => {
    if (seenIds.has(task.id)) return false;
    seenIds.add(task.id);
    return true;
  });

  return replaceOrderedStatuses(
    uniqueTasks,
    new Map(
      TASK_STATUSES.map((status) => [
        status,
        tasksInStatus(uniqueTasks, status),
      ]),
    ),
  );
}

export function moveTask(
  tasks: readonly Task[],
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number,
  updatedAt: string,
): Task[] {
  const movingTask = tasks.find((task) => task.id === taskId);
  if (!movingTask) return tasks as Task[];

  const sourceStatus = movingTask.status;
  const sourceTasks = tasksInStatus(tasks, sourceStatus).filter(
    (task) => task.id !== taskId,
  );
  const targetTasks =
    sourceStatus === toStatus
      ? sourceTasks
      : tasksInStatus(tasks, toStatus).filter((task) => task.id !== taskId);
  const insertionIndex = Math.max(0, Math.min(toIndex, targetTasks.length));
  const movedTask = { ...movingTask, status: toStatus, updatedAt };
  const reorderedTarget = [...targetTasks];
  reorderedTarget.splice(insertionIndex, 0, movedTask);

  const orderedByStatus = new Map<TaskStatus, readonly Task[]>([
    [toStatus, reorderedTarget],
  ]);
  if (sourceStatus !== toStatus) {
    orderedByStatus.set(sourceStatus, sourceTasks);
  }

  return replaceOrderedStatuses(tasks, orderedByStatus);
}

function nextTaskNumberForCreatedTask(
  currentNumber: number,
  task: Task,
): number {
  const match = /^FT-(\d+)$/.exec(task.key);
  const numberFromKey = match ? Number(match[1]) + 1 : currentNumber + 1;
  return Math.max(currentNumber + 1, numberFromKey);
}

export function taskReducer(
  state: TaskSnapshotV1,
  action: TaskAction,
): TaskSnapshotV1 {
  switch (action.type) {
    case 'hydrate':
      return {
        ...action.payload,
        tasks: normalizeTaskPositions(action.payload.tasks),
        members: [...action.payload.members],
      };

    case 'task/created': {
      if (state.tasks.some((task) => task.id === action.payload.id)) {
        return state;
      }

      const tasks = [...state.tasks, action.payload];
      return {
        ...state,
        nextTaskNumber: nextTaskNumberForCreatedTask(
          state.nextTaskNumber,
          action.payload,
        ),
        tasks: replaceOrderedStatuses(
          tasks,
          new Map([
            [
              action.payload.status,
              tasksInStatus(tasks, action.payload.status),
            ],
          ]),
        ),
      };
    }

    case 'task/updated': {
      const currentTask = state.tasks.find(
        (task) => task.id === action.payload.id,
      );
      if (!currentTask) return state;

      const safeUpdate: Task = {
        ...action.payload,
        id: currentTask.id,
        key: currentTask.key,
        createdAt: currentTask.createdAt,
        position: currentTask.position,
      };

      if (safeUpdate.status !== currentTask.status) {
        const tasksWithUpdate = state.tasks.map((task) =>
          task.id === safeUpdate.id
            ? { ...safeUpdate, status: currentTask.status }
            : task,
        );
        return {
          ...state,
          tasks: moveTask(
            tasksWithUpdate,
            safeUpdate.id,
            safeUpdate.status,
            tasksInStatus(state.tasks, safeUpdate.status).length,
            safeUpdate.updatedAt,
          ),
        };
      }

      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === safeUpdate.id ? safeUpdate : task,
        ),
      };
    }

    case 'task/deleted': {
      const deletedTask = state.tasks.find(
        (task) => task.id === action.payload.taskId,
      );
      if (!deletedTask) return state;

      const tasks = state.tasks.filter(
        (task) => task.id !== action.payload.taskId,
      );
      return {
        ...state,
        tasks: replaceOrderedStatuses(
          tasks,
          new Map([
            [deletedTask.status, tasksInStatus(tasks, deletedTask.status)],
          ]),
        ),
      };
    }

    case 'task/moved':
      if (!state.tasks.some((task) => task.id === action.payload.taskId)) {
        return state;
      }
      return {
        ...state,
        tasks: moveTask(
          state.tasks,
          action.payload.taskId,
          action.payload.toStatus,
          action.payload.toIndex,
          action.payload.updatedAt,
        ),
      };
  }
}
