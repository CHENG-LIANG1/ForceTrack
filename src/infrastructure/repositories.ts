import type { UserPreferences } from '@/domain/member';
import type { TaskSnapshotV1 } from '@/domain/task';

export type LoadResult =
  | { kind: 'loaded'; snapshot: TaskSnapshotV1 }
  | { kind: 'seeded'; snapshot: TaskSnapshotV1 }
  | { kind: 'recovered'; snapshot: TaskSnapshotV1 };

export interface TaskRepository {
  load(): Promise<LoadResult>;
  save(snapshot: TaskSnapshotV1): Promise<void>;
}

export interface PreferencesRepository {
  load(): Promise<UserPreferences>;
  save(preferences: UserPreferences): Promise<void>;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type RepositoryOperation = 'read' | 'write' | 'validation' | 'recovery';

export class RepositoryError extends Error {
  readonly operation: RepositoryOperation;
  override readonly cause: unknown;

  constructor(operation: RepositoryOperation, cause: unknown) {
    super(`Repository ${operation} failed`);
    this.name = 'RepositoryError';
    this.operation = operation;
    this.cause = cause;
  }
}

export function browserStorage(): StorageAdapter {
  try {
    return window.localStorage;
  } catch (error) {
    throw new RepositoryError('read', error);
  }
}
