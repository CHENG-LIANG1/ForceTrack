import { createContext, useContext } from 'react';

import type {
  CreateTaskInput,
  TaskStatus,
  TaskSnapshotV2,
  UpdateTaskInput,
} from '@/domain/task';
import type { MemberFields } from '@/domain/member';
import type { SprintFields, SprintStartFields } from '@/domain/sprint';

export interface TaskContextValue {
  snapshot: TaskSnapshotV2 | null;
  isReady: boolean;
  loadWasRecovered: boolean;
  persistenceFailed: boolean;
  createTask(input: CreateTaskInput): Promise<void>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  createSprint(fields: SprintFields): Promise<void>;
  updateSprint(sprintId: string, fields: SprintFields): Promise<void>;
  startSprint(sprintId: string, fields: SprintStartFields): Promise<void>;
  completeSprint(
    sprintId: string,
    targetSprintId?: string | null,
  ): Promise<void>;
  deleteSprint(sprintId: string, targetSprintId?: string | null): Promise<void>;
  createMember(fields: MemberFields): Promise<void>;
  moveTask(
    taskId: string,
    toStatus: TaskStatus,
    toIndex: number,
  ): Promise<void>;
  rankBacklogTask(
    taskId: string,
    sprintId: string | null,
    toIndex: number,
  ): Promise<void>;
}

export const TaskContext = createContext<TaskContextValue | null>(null);

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be rendered inside TaskProvider');
  }
  return context;
}
