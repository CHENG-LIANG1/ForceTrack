import type { TaskSnapshotV1 } from '@/domain/task';
import {
  RepositoryError,
  browserStorage,
  type LoadResult,
  type StorageAdapter,
  type TaskRepository,
} from '@/infrastructure/repositories';
import { createBrowserSeedSnapshot } from '@/infrastructure/seed-data';
import { taskSnapshotV1Schema } from '@/infrastructure/storage-schema';

export const TASK_STORAGE_KEY = 'forcetrack:tasks:v1';
export const RECOVERY_STORAGE_KEY = 'forcetrack:recovery:last-invalid';

export class LocalTaskRepository implements TaskRepository {
  constructor(
    private readonly storage: StorageAdapter = browserStorage(),
    private readonly seedFactory: () => TaskSnapshotV1 = createBrowserSeedSnapshot,
  ) {}

  async load(): Promise<LoadResult> {
    let rawSnapshot: string | null;
    try {
      rawSnapshot = this.storage.getItem(TASK_STORAGE_KEY);
    } catch (error) {
      throw new RepositoryError('read', error);
    }

    if (rawSnapshot === null) {
      const snapshot = this.validatedSeed();
      await this.save(snapshot);
      return { kind: 'seeded', snapshot };
    }

    try {
      const snapshot = taskSnapshotV1Schema.parse(JSON.parse(rawSnapshot));
      return { kind: 'loaded', snapshot };
    } catch {
      const snapshot = this.validatedSeed();
      try {
        this.storage.setItem(RECOVERY_STORAGE_KEY, rawSnapshot);
      } catch (error) {
        throw new RepositoryError('recovery', error);
      }
      await this.save(snapshot);
      return { kind: 'recovered', snapshot };
    }
  }

  async save(snapshot: TaskSnapshotV1): Promise<void> {
    let validatedSnapshot: TaskSnapshotV1;
    try {
      validatedSnapshot = taskSnapshotV1Schema.parse(snapshot);
    } catch (error) {
      throw new RepositoryError('validation', error);
    }

    try {
      this.storage.setItem(TASK_STORAGE_KEY, JSON.stringify(validatedSnapshot));
    } catch (error) {
      throw new RepositoryError('write', error);
    }
  }

  private validatedSeed(): TaskSnapshotV1 {
    try {
      return taskSnapshotV1Schema.parse(this.seedFactory());
    } catch (error) {
      throw new RepositoryError('validation', error);
    }
  }
}
