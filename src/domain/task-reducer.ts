import type { TaskAction } from '@/domain/actions';
import { normalizeMemberEmail } from '@/domain/member';
import {
  TASK_STATUSES,
  type Task,
  type TaskSnapshotV2,
  type TaskStatus,
} from '@/domain/task';

function tasksInStatus(tasks: readonly Task[], status: TaskStatus): Task[] {
  return tasks
    .filter((task) => task.status === status)
    .sort(
      (left, right) =>
        left.position - right.position || left.id.localeCompare(right.id),
    );
}

function tasksInPlanningSection(
  tasks: readonly Task[],
  sprintId: string | null,
): Task[] {
  return tasks
    .filter((task) => task.sprintId === sprintId)
    .sort(
      (left, right) =>
        left.rank - right.rank || left.id.localeCompare(right.id),
    );
}

function replaceTasks(
  tasks: readonly Task[],
  replacements: readonly Task[],
): Task[] {
  const byId = new Map(replacements.map((task) => [task.id, task]));
  return tasks.map((task) => byId.get(task.id) ?? task);
}

function replaceOrderedStatuses(
  tasks: readonly Task[],
  orderedByStatus: ReadonlyMap<TaskStatus, readonly Task[]>,
): Task[] {
  const replacements: Task[] = [];
  for (const [status, orderedTasks] of orderedByStatus) {
    orderedTasks.forEach((task, position) => {
      replacements.push({ ...task, status, position });
    });
  }
  return replaceTasks(tasks, replacements);
}

function replaceOrderedPlanningSections(
  tasks: readonly Task[],
  orderedBySprint: ReadonlyMap<string | null, readonly Task[]>,
): Task[] {
  const replacements: Task[] = [];
  for (const [sprintId, orderedTasks] of orderedBySprint) {
    orderedTasks.forEach((task, rank) => {
      replacements.push({ ...task, sprintId, rank });
    });
  }
  return replaceTasks(tasks, replacements);
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

export function normalizeTaskRanks(tasks: readonly Task[]): Task[] {
  const sprintIds = new Set(tasks.map((task) => task.sprintId));
  return replaceOrderedPlanningSections(
    tasks,
    new Map(
      [...sprintIds].map((sprintId) => [
        sprintId,
        tasksInPlanningSection(tasks, sprintId),
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
  const reorderedTarget = [...targetTasks];
  reorderedTarget.splice(insertionIndex, 0, {
    ...movingTask,
    status: toStatus,
    updatedAt,
  });

  const orderedByStatus = new Map<TaskStatus, readonly Task[]>([
    [toStatus, reorderedTarget],
  ]);
  if (sourceStatus !== toStatus) orderedByStatus.set(sourceStatus, sourceTasks);
  return replaceOrderedStatuses(tasks, orderedByStatus);
}

export function rankBacklogTask(
  tasks: readonly Task[],
  taskId: string,
  sprintId: string | null,
  toIndex: number,
  updatedAt: string,
): Task[] {
  const movingTask = tasks.find((task) => task.id === taskId);
  if (!movingTask) return tasks as Task[];

  const sourceSprintId = movingTask.sprintId;
  const sourceTasks = tasksInPlanningSection(tasks, sourceSprintId).filter(
    (task) => task.id !== taskId,
  );
  const targetTasks =
    sourceSprintId === sprintId
      ? sourceTasks
      : tasksInPlanningSection(tasks, sprintId).filter(
          (task) => task.id !== taskId,
        );
  const insertionIndex = Math.max(0, Math.min(toIndex, targetTasks.length));
  const reorderedTarget = [...targetTasks];
  reorderedTarget.splice(insertionIndex, 0, {
    ...movingTask,
    sprintId,
    updatedAt,
  });

  const orderedBySprint = new Map<string | null, readonly Task[]>([
    [sprintId, reorderedTarget],
  ]);
  if (sourceSprintId !== sprintId) {
    orderedBySprint.set(sourceSprintId, sourceTasks);
  }
  return replaceOrderedPlanningSections(tasks, orderedBySprint);
}

function nextTaskNumberForCreatedTask(
  currentNumber: number,
  task: Task,
): number {
  const match = /^[A-Z][A-Z0-9]{1,9}-(\d+)$/.exec(task.key);
  const numberFromKey = match ? Number(match[1]) + 1 : currentNumber + 1;
  return Math.max(currentNumber + 1, numberFromKey);
}

function planningTargetExists(
  state: TaskSnapshotV2,
  sprintId: string | null,
): boolean {
  return (
    sprintId === null ||
    state.sprints.some(
      (sprint) => sprint.id === sprintId && sprint.status !== 'completed',
    )
  );
}

export function taskReducer(
  state: TaskSnapshotV2,
  action: TaskAction,
): TaskSnapshotV2 {
  switch (action.type) {
    case 'hydrate':
      return {
        ...action.payload,
        tasks: normalizeTaskRanks(normalizeTaskPositions(action.payload.tasks)),
        members: action.payload.members.map((member) => ({ ...member })),
        sprints: action.payload.sprints.map((sprint) => ({ ...sprint })),
      };

    case 'task/created': {
      if (
        state.tasks.some((task) => task.id === action.payload.id) ||
        !planningTargetExists(state, action.payload.sprintId)
      ) {
        return state;
      }
      const created = {
        ...action.payload,
        position: tasksInStatus(state.tasks, action.payload.status).length,
        rank: tasksInPlanningSection(state.tasks, action.payload.sprintId)
          .length,
      };
      return {
        ...state,
        nextTaskNumber: nextTaskNumberForCreatedTask(
          state.nextTaskNumber,
          created,
        ),
        tasks: [...state.tasks, created],
      };
    }

    case 'task/updated': {
      const currentTask = state.tasks.find(
        (task) => task.id === action.payload.id,
      );
      if (
        !currentTask ||
        !planningTargetExists(state, action.payload.sprintId)
      ) {
        return state;
      }
      const safeUpdate: Task = {
        ...action.payload,
        id: currentTask.id,
        key: currentTask.key,
        createdAt: currentTask.createdAt,
        position: currentTask.position,
        rank: currentTask.rank,
        status: currentTask.status,
        sprintId: currentTask.sprintId,
      };
      let tasks = state.tasks.map((task) =>
        task.id === safeUpdate.id ? safeUpdate : task,
      );
      if (action.payload.status !== currentTask.status) {
        tasks = moveTask(
          tasks,
          safeUpdate.id,
          action.payload.status,
          tasksInStatus(state.tasks, action.payload.status).length,
          action.payload.updatedAt,
        );
      }
      if (action.payload.sprintId !== currentTask.sprintId) {
        tasks = rankBacklogTask(
          tasks,
          safeUpdate.id,
          action.payload.sprintId,
          tasksInPlanningSection(state.tasks, action.payload.sprintId).length,
          action.payload.updatedAt,
        );
      }
      return { ...state, tasks };
    }

    case 'task/deleted': {
      const deletedTask = state.tasks.find(
        (task) => task.id === action.payload.taskId,
      );
      if (!deletedTask) return state;
      const remaining = state.tasks
        .filter((task) => task.id !== action.payload.taskId)
        .map((task) =>
          task.parentId === action.payload.taskId
            ? { ...task, parentId: null }
            : task,
        );
      return {
        ...state,
        tasks: normalizeTaskRanks(normalizeTaskPositions(remaining)),
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

    case 'backlog/task-ranked':
      if (!planningTargetExists(state, action.payload.sprintId)) return state;
      return {
        ...state,
        tasks: rankBacklogTask(
          state.tasks,
          action.payload.taskId,
          action.payload.sprintId,
          action.payload.toIndex,
          action.payload.updatedAt,
        ),
      };

    case 'sprint/created':
      if (state.sprints.some((sprint) => sprint.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        sprints: [
          ...state.sprints,
          { ...action.payload, position: state.sprints.length },
        ],
      };

    case 'sprint/updated': {
      const current = state.sprints.find(
        (sprint) => sprint.id === action.payload.id,
      );
      if (!current || current.status === 'completed') return state;
      return {
        ...state,
        sprints: state.sprints.map((sprint) =>
          sprint.id === current.id
            ? {
                ...action.payload,
                id: current.id,
                status: current.status,
                position: current.position,
                createdAt: current.createdAt,
                startedAt: current.startedAt,
                completedAt: current.completedAt,
              }
            : sprint,
        ),
      };
    }

    case 'sprint/started': {
      const current = state.sprints.find(
        (sprint) => sprint.id === action.payload.sprintId,
      );
      if (
        !current ||
        current.status !== 'planned' ||
        state.sprints.some((sprint) => sprint.status === 'active') ||
        !state.tasks.some((task) => task.sprintId === current.id)
      ) {
        return state;
      }
      return {
        ...state,
        sprints: state.sprints.map((sprint) =>
          sprint.id === current.id
            ? {
                ...action.payload.sprint,
                id: current.id,
                status: 'active',
                position: current.position,
                createdAt: current.createdAt,
                completedAt: null,
              }
            : sprint,
        ),
      };
    }

    case 'sprint/completed': {
      const current = state.sprints.find(
        (sprint) => sprint.id === action.payload.sprintId,
      );
      if (
        !current ||
        current.status !== 'active' ||
        !planningTargetExists(state, action.payload.incompleteTargetSprintId) ||
        action.payload.incompleteTargetSprintId === current.id
      ) {
        return state;
      }
      const targetTasks = tasksInPlanningSection(
        state.tasks,
        action.payload.incompleteTargetSprintId,
      );
      const completedTasks = tasksInPlanningSection(
        state.tasks,
        current.id,
      ).filter((task) => task.status === 'done');
      const incompleteTasks = tasksInPlanningSection(state.tasks, current.id)
        .filter((task) => task.status !== 'done')
        .map((task) => ({
          ...task,
          sprintId: action.payload.incompleteTargetSprintId,
          updatedAt: action.payload.completedAt,
        }));
      const tasks = replaceOrderedPlanningSections(
        state.tasks,
        new Map([
          [current.id, completedTasks],
          [
            action.payload.incompleteTargetSprintId,
            [...targetTasks, ...incompleteTasks],
          ],
        ]),
      );
      return {
        ...state,
        tasks,
        sprints: state.sprints.map((sprint) =>
          sprint.id === current.id
            ? {
                ...sprint,
                status: 'completed',
                completedAt: action.payload.completedAt,
              }
            : sprint,
        ),
      };
    }

    case 'sprint/deleted': {
      const current = state.sprints.find(
        (sprint) => sprint.id === action.payload.sprintId,
      );
      if (
        !current ||
        current.status !== 'planned' ||
        !planningTargetExists(state, action.payload.taskTargetSprintId) ||
        action.payload.taskTargetSprintId === current.id
      ) {
        return state;
      }
      const targetTasks = tasksInPlanningSection(
        state.tasks,
        action.payload.taskTargetSprintId,
      );
      const movedTasks = tasksInPlanningSection(state.tasks, current.id).map(
        (task) => ({ ...task, sprintId: action.payload.taskTargetSprintId }),
      );
      const tasks = replaceOrderedPlanningSections(
        state.tasks,
        new Map([
          [current.id, []],
          [action.payload.taskTargetSprintId, [...targetTasks, ...movedTasks]],
        ]),
      );
      const sprints = state.sprints
        .filter((sprint) => sprint.id !== current.id)
        .sort((left, right) => left.position - right.position)
        .map((sprint, position) => ({ ...sprint, position }));
      return { ...state, tasks, sprints };
    }

    case 'member/created':
      if (
        state.members.some(
          (member) =>
            member.id === action.payload.id ||
            normalizeMemberEmail(member.email) ===
              normalizeMemberEmail(action.payload.email),
        )
      ) {
        return state;
      }
      return { ...state, members: [...state.members, action.payload] };
  }
}
