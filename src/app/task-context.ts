import { createContext, useContext } from 'react';

import type {
  CreateTaskInput,
  TaskSnapshotV1,
  UpdateTaskInput,
} from '@/domain/task';

export interface TaskContextValue {
  snapshot: TaskSnapshotV1 | null;
  isReady: boolean;
  loadWasRecovered: boolean;
  persistenceFailed: boolean;
  createTask(input: CreateTaskInput): Promise<void>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
}

export const TaskContext = createContext<TaskContextValue | null>(null);

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be rendered inside TaskProvider');
  }
  return context;
}
