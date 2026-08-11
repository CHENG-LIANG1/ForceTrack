import type { TaskSnapshotV2 } from '@/domain/task';
import {
  RepositoryError,
  browserStorage,
  type LoadResult,
  type StorageAdapter,
  type TaskRepository,
} from '@/infrastructure/repositories';
import { createBrowserSeedSnapshot } from '@/infrastructure/seed-data';
import {
  taskSnapshotV1Schema,
  taskSnapshotV2Schema,
} from '@/infrastructure/storage-schema';
import { migrateTaskSnapshotV1 } from '@/infrastructure/task-migration';

export const TASK_STORAGE_KEY = 'forcetrack:tasks:v2';
export const LEGACY_TASK_STORAGE_KEY = 'forcetrack:tasks:v1';
export const RECOVERY_STORAGE_KEY = 'forcetrack:recovery:last-invalid';

export class LocalTaskRepository implements TaskRepository {
  constructor(
    private readonly storage: StorageAdapter = browserStorage(),
    private readonly seedFactory: () => TaskSnapshotV2 = createBrowserSeedSnapshot,
  ) {}

  async load(): Promise<LoadResult> {
    const rawV2 = this.read(TASK_STORAGE_KEY);
    if (rawV2 !== null) {
      try {
        return {
          kind: 'loaded',
          snapshot: taskSnapshotV2Schema.parse(JSON.parse(rawV2)),
        };
      } catch {
        return this.recover(rawV2);
      }
    }

    const rawV1 = this.read(LEGACY_TASK_STORAGE_KEY);
    if (rawV1 !== null) {
      try {
        const legacySnapshot = taskSnapshotV1Schema.parse(JSON.parse(rawV1));
        const snapshot = taskSnapshotV2Schema.parse(
          migrateTaskSnapshotV1(legacySnapshot),
        );
        await this.save(snapshot);
        return { kind: 'migrated', snapshot };
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return this.recover(rawV1);
      }
    }

    const snapshot = this.validatedSeed();
    await this.save(snapshot);
    return { kind: 'seeded', snapshot };
  }

  async save(snapshot: TaskSnapshotV2): Promise<void> {
    let validatedSnapshot: TaskSnapshotV2;
    try {
      validatedSnapshot = taskSnapshotV2Schema.parse(snapshot);
    } catch (error) {
      throw new RepositoryError('validation', error);
    }

    try {
      this.storage.setItem(TASK_STORAGE_KEY, JSON.stringify(validatedSnapshot));
    } catch (error) {
      throw new RepositoryError('write', error);
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      throw new RepositoryError('read', error);
    }
  }

  private async recover(invalidRaw: string): Promise<LoadResult> {
    const snapshot = this.validatedSeed();
    try {
      this.storage.setItem(RECOVERY_STORAGE_KEY, invalidRaw);
    } catch (error) {
      throw new RepositoryError('recovery', error);
    }
    await this.save(snapshot);
    return { kind: 'recovered', snapshot };
  }

  private validatedSeed(): TaskSnapshotV2 {
    try {
      return taskSnapshotV2Schema.parse(this.seedFactory());
    } catch (error) {
      throw new RepositoryError('validation', error);
    }
  }
}
