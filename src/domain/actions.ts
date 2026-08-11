import { createMember, type Member, type MemberFields } from '@/domain/member';
import {
  completeSprint,
  createSprint,
  startSprint,
  updateSprint,
  SprintLifecycleError,
  type Sprint,
  type SprintFields,
  type SprintStartFields,
} from '@/domain/sprint';
import {
  createTask,
  updateTask,
  type CreateTaskInput,
  type DomainDependencies,
  type Task,
  type TaskSnapshotV2,
  type TaskStatus,
  type UpdateTaskInput,
} from '@/domain/task';

export type TaskAction =
  | { type: 'hydrate'; payload: TaskSnapshotV2 }
  | { type: 'task/created'; payload: Task }
  | { type: 'task/updated'; payload: Task }
  | { type: 'task/deleted'; payload: { taskId: string } }
  | {
      type: 'task/moved';
      payload: {
        taskId: string;
        toStatus: TaskStatus;
        toIndex: number;
        updatedAt: string;
      };
    }
  | {
      type: 'backlog/task-ranked';
      payload: {
        taskId: string;
        sprintId: string | null;
        toIndex: number;
        updatedAt: string;
      };
    }
  | { type: 'sprint/created'; payload: Sprint }
  | { type: 'sprint/updated'; payload: Sprint }
  | {
      type: 'sprint/started';
      payload: { sprintId: string; sprint: Sprint };
    }
  | {
      type: 'sprint/completed';
      payload: {
        sprintId: string;
        completedAt: string;
        incompleteTargetSprintId: string | null;
      };
    }
  | {
      type: 'sprint/deleted';
      payload: { sprintId: string; taskTargetSprintId: string | null };
    }
  | { type: 'member/created'; payload: Member };

export function createTaskAction(
  snapshot: TaskSnapshotV2,
  input: CreateTaskInput,
  dependencies: DomainDependencies,
): TaskAction {
  return {
    type: 'task/created',
    payload: createTask(snapshot, input, dependencies),
  };
}

export function updateTaskAction(
  snapshot: TaskSnapshotV2,
  taskId: string,
  input: UpdateTaskInput,
  dependencies: Pick<DomainDependencies, 'now'>,
): TaskAction | null {
  const currentTask = snapshot.tasks.find((task) => task.id === taskId);
  if (!currentTask) return null;

  return {
    type: 'task/updated',
    payload: updateTask(
      currentTask,
      input,
      snapshot.members,
      dependencies,
      snapshot.tasks,
      snapshot.sprints,
    ),
  };
}

export function moveTaskAction(
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number,
  dependencies: Pick<DomainDependencies, 'now'>,
): TaskAction {
  return {
    type: 'task/moved',
    payload: { taskId, toStatus, toIndex, updatedAt: dependencies.now() },
  };
}

export function rankBacklogTaskAction(
  taskId: string,
  sprintId: string | null,
  toIndex: number,
  dependencies: Pick<DomainDependencies, 'now'>,
): TaskAction {
  return {
    type: 'backlog/task-ranked',
    payload: { taskId, sprintId, toIndex, updatedAt: dependencies.now() },
  };
}

export function createSprintAction(
  snapshot: TaskSnapshotV2,
  fields: SprintFields,
  dependencies: DomainDependencies,
): TaskAction {
  const nextPosition =
    snapshot.sprints.reduce(
      (highest, sprint) => Math.max(highest, sprint.position),
      -1,
    ) + 1;
  return {
    type: 'sprint/created',
    payload: createSprint(fields, dependencies, nextPosition),
  };
}

export function updateSprintAction(
  snapshot: TaskSnapshotV2,
  sprintId: string,
  fields: SprintFields,
): TaskAction | null {
  const sprint = snapshot.sprints.find(
    (candidate) => candidate.id === sprintId,
  );
  return sprint
    ? { type: 'sprint/updated', payload: updateSprint(sprint, fields) }
    : null;
}

export function startSprintAction(
  snapshot: TaskSnapshotV2,
  sprintId: string,
  fields: SprintStartFields,
  dependencies: Pick<DomainDependencies, 'now'>,
): TaskAction | null {
  const sprint = snapshot.sprints.find(
    (candidate) => candidate.id === sprintId,
  );
  if (!sprint) return null;
  const taskCount = snapshot.tasks.filter(
    (task) => task.sprintId === sprintId,
  ).length;
  return {
    type: 'sprint/started',
    payload: {
      sprintId,
      sprint: startSprint(
        sprint,
        fields,
        snapshot.sprints,
        taskCount,
        dependencies.now(),
      ),
    },
  };
}

export function completeSprintAction(
  snapshot: TaskSnapshotV2,
  sprintId: string,
  incompleteTargetSprintId: string | null,
  dependencies: Pick<DomainDependencies, 'now'>,
): TaskAction | null {
  const sprint = snapshot.sprints.find(
    (candidate) => candidate.id === sprintId,
  );
  if (!sprint) return null;
  if (
    incompleteTargetSprintId !== null &&
    !snapshot.sprints.some(
      (candidate) =>
        candidate.id === incompleteTargetSprintId &&
        candidate.status === 'planned',
    )
  ) {
    throw new SprintLifecycleError('invalid_target');
  }
  const completedAt = dependencies.now();
  completeSprint(sprint, completedAt);
  return {
    type: 'sprint/completed',
    payload: { sprintId, completedAt, incompleteTargetSprintId },
  };
}

export function deleteSprintAction(
  snapshot: TaskSnapshotV2,
  sprintId: string,
  requestedTaskTargetSprintId?: string | null,
): TaskAction | null {
  const sprint = snapshot.sprints.find(
    (candidate) => candidate.id === sprintId,
  );
  if (!sprint) return null;
  if (sprint.status !== 'planned') {
    throw new SprintLifecycleError('invalid_status');
  }
  const taskTargetSprintId =
    requestedTaskTargetSprintId === undefined
      ? (snapshot.sprints
          .filter(
            (candidate) =>
              candidate.status === 'planned' &&
              candidate.position > sprint.position,
          )
          .sort((left, right) => left.position - right.position)[0]?.id ?? null)
      : requestedTaskTargetSprintId;
  if (
    taskTargetSprintId !== null &&
    !snapshot.sprints.some(
      (candidate) =>
        candidate.id === taskTargetSprintId &&
        candidate.id !== sprintId &&
        candidate.status === 'planned',
    )
  ) {
    throw new SprintLifecycleError('invalid_target');
  }
  return {
    type: 'sprint/deleted',
    payload: { sprintId, taskTargetSprintId },
  };
}

export function createMemberAction(
  snapshot: TaskSnapshotV2,
  fields: MemberFields,
  dependencies: DomainDependencies,
): TaskAction {
  return {
    type: 'member/created',
    payload: createMember(fields, snapshot.members, dependencies),
  };
}
