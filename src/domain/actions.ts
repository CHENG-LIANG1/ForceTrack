import {
  createTask,
  updateTask,
  type CreateTaskInput,
  type DomainDependencies,
  type Task,
  type TaskSnapshotV1,
  type TaskStatus,
  type UpdateTaskInput,
} from '@/domain/task';

export type TaskAction =
  | { type: 'hydrate'; payload: TaskSnapshotV1 }
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
    };

export function createTaskAction(
  snapshot: TaskSnapshotV1,
  input: CreateTaskInput,
  dependencies: DomainDependencies,
): TaskAction {
  return {
    type: 'task/created',
    payload: createTask(snapshot, input, dependencies),
  };
}

export function updateTaskAction(
  snapshot: TaskSnapshotV1,
  taskId: string,
  input: UpdateTaskInput,
  dependencies: Pick<DomainDependencies, 'now'>,
): TaskAction | null {
  const currentTask = snapshot.tasks.find((task) => task.id === taskId);
  if (!currentTask) return null;

  return {
    type: 'task/updated',
    payload: updateTask(currentTask, input, snapshot.members, dependencies),
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
