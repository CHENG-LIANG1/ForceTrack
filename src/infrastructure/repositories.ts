import type { UserPreferences } from '@/domain/member';
import type { TaskSnapshotV2 } from '@/domain/task';
import type { WorkspaceSnapshotV3 } from '@/domain/project';

export type LoadResult =
  | { kind: 'loaded'; snapshot: TaskSnapshotV2 }
  | { kind: 'migrated'; snapshot: TaskSnapshotV2 }
  | { kind: 'seeded'; snapshot: TaskSnapshotV2 }
  | { kind: 'recovered'; snapshot: TaskSnapshotV2 };

export interface TaskRepository {
  load(): Promise<LoadResult>;
  save(snapshot: TaskSnapshotV2): Promise<void>;
}

export type WorkspaceLoadResult = {
  kind: 'loaded' | 'migrated' | 'seeded' | 'recovered';
  snapshot: WorkspaceSnapshotV3;
};

export interface WorkspaceRepository {
  load(): Promise<WorkspaceLoadResult>;
  save(snapshot: WorkspaceSnapshotV3): Promise<void>;
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
