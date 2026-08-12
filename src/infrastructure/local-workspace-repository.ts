import type { WorkspaceSnapshotV3 } from '@/domain/project';
import { wrapLegacySnapshot } from '@/domain/workspace';
import {
  RepositoryError,
  browserStorage,
  type StorageAdapter,
  type WorkspaceLoadResult,
  type WorkspaceRepository,
} from '@/infrastructure/repositories';
import { createBrowserSeedSnapshot } from '@/infrastructure/seed-data';
import {
  LEGACY_TASK_STORAGE_KEY,
  TASK_STORAGE_KEY,
} from '@/infrastructure/local-task-repository';
import {
  taskSnapshotV1Schema,
  taskSnapshotV2Schema,
} from '@/infrastructure/storage-schema';
import { migrateTaskSnapshotV1 } from '@/infrastructure/task-migration';
import { workspaceSnapshotV3Schema } from '@/infrastructure/workspace-schema';

export const WORKSPACE_STORAGE_KEY = 'forcetrack:workspace:v3';
export const WORKSPACE_RECOVERY_STORAGE_KEY =
  'forcetrack:recovery:workspace:last-invalid';

export class LocalWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly storage: StorageAdapter = browserStorage(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async load(): Promise<WorkspaceLoadResult> {
    const rawWorkspace = this.read(WORKSPACE_STORAGE_KEY);
    if (rawWorkspace !== null) {
      try {
        return {
          kind: 'loaded',
          snapshot: workspaceSnapshotV3Schema.parse(JSON.parse(rawWorkspace)),
        };
      } catch {
        this.backup(rawWorkspace);
        return this.loadLegacyOrSeed('recovered');
      }
    }
    return this.loadLegacyOrSeed('migrated');
  }

  async save(snapshot: WorkspaceSnapshotV3): Promise<void> {
    let validated: WorkspaceSnapshotV3;
    try {
      validated = workspaceSnapshotV3Schema.parse(snapshot);
    } catch (error) {
      throw new RepositoryError('validation', error);
    }
    try {
      this.storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(validated));
    } catch (error) {
      throw new RepositoryError('write', error);
    }
  }

  private async loadLegacyOrSeed(
    kind: 'migrated' | 'recovered',
  ): Promise<WorkspaceLoadResult> {
    const rawV2 = this.read(TASK_STORAGE_KEY);
    if (rawV2 !== null) {
      try {
        const workspace = wrapLegacySnapshot(
          taskSnapshotV2Schema.parse(JSON.parse(rawV2)),
          this.now(),
        );
        await this.save(workspace);
        return { kind, snapshot: workspace };
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
      }
    }
    const rawV1 = this.read(LEGACY_TASK_STORAGE_KEY);
    if (rawV1 !== null) {
      try {
        const v2 = migrateTaskSnapshotV1(
          taskSnapshotV1Schema.parse(JSON.parse(rawV1)),
        );
        const workspace = wrapLegacySnapshot(v2, this.now());
        await this.save(workspace);
        return { kind, snapshot: workspace };
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
      }
    }
    const workspace = wrapLegacySnapshot(
      createBrowserSeedSnapshot(),
      this.now(),
    );
    await this.save(workspace);
    return {
      kind: kind === 'recovered' ? 'recovered' : 'seeded',
      snapshot: workspace,
    };
  }

  private read(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      throw new RepositoryError('read', error);
    }
  }

  private backup(raw: string): void {
    try {
      this.storage.setItem(WORKSPACE_RECOVERY_STORAGE_KEY, raw);
    } catch (error) {
      throw new RepositoryError('recovery', error);
    }
  }
}
