import {
  LocalWorkspaceRepository,
  WORKSPACE_RECOVERY_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
} from '@/infrastructure/local-workspace-repository';
import { TASK_STORAGE_KEY } from '@/infrastructure/local-task-repository';
import { LEGACY_TASK_STORAGE_KEY } from '@/infrastructure/local-task-repository';
import type { StorageAdapter } from '@/infrastructure/repositories';
import { workspaceSnapshotV3Schema } from '@/infrastructure/workspace-schema';
import { makeLegacySnapshot, makeSnapshot } from '@/test/fixtures';

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  readError: unknown;
  writeError: unknown;
  writeErrorKey: string | null = null;
  getItem(key: string) {
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (
      this.writeError &&
      (!this.writeErrorKey || this.writeErrorKey === key)
    ) {
      throw this.writeError;
    }
    this.values.set(key, value);
  }
}

const NOW = '2026-08-12T00:00:00.000Z';

describe('LocalWorkspaceRepository', () => {
  it('wraps valid V2 data once and leaves the legacy source untouched', async () => {
    const storage = new MemoryStorage();
    const legacyRaw = JSON.stringify(makeSnapshot());
    storage.values.set(TASK_STORAGE_KEY, legacyRaw);

    const result = await new LocalWorkspaceRepository(
      storage,
      () => NOW,
    ).load();

    expect(result.kind).toBe('migrated');
    expect(result.snapshot.projects[0]).toMatchObject({
      id: 'project-forcetrack',
      key: 'FT',
      nextTaskNumber: 3,
    });
    expect(result.snapshot.projects[0].tasks).toEqual(makeSnapshot().tasks);
    expect(storage.values.get(TASK_STORAGE_KEY)).toBe(legacyRaw);
    expect(storage.values.has(WORKSPACE_STORAGE_KEY)).toBe(true);
  });

  it('loads a valid empty V3 workspace without seeding a project', async () => {
    const storage = new MemoryStorage();
    storage.values.set(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 3, projects: [] }),
    );

    await expect(
      new LocalWorkspaceRepository(storage, () => NOW).load(),
    ).resolves.toEqual({
      kind: 'loaded',
      snapshot: { schemaVersion: 3, projects: [] },
    });
  });

  it('backs up corrupt V3 data and recovers from valid V2', async () => {
    const storage = new MemoryStorage();
    const invalid = '{broken';
    storage.values.set(WORKSPACE_STORAGE_KEY, invalid);
    storage.values.set(TASK_STORAGE_KEY, JSON.stringify(makeSnapshot()));

    const result = await new LocalWorkspaceRepository(
      storage,
      () => NOW,
    ).load();

    expect(result.kind).toBe('recovered');
    expect(result.snapshot.projects[0].tasks).toHaveLength(2);
    expect(storage.values.get(WORKSPACE_RECOVERY_STORAGE_KEY)).toBe(invalid);
  });

  it('migrates V1 when V2 is absent and seeds when both legacy records are invalid', async () => {
    const v1Storage = new MemoryStorage();
    v1Storage.values.set(
      LEGACY_TASK_STORAGE_KEY,
      JSON.stringify(makeLegacySnapshot()),
    );
    const migrated = await new LocalWorkspaceRepository(
      v1Storage,
      () => NOW,
    ).load();
    expect(migrated).toMatchObject({ kind: 'migrated' });
    expect(migrated.snapshot.projects[0].tasks).toHaveLength(2);

    const corruptStorage = new MemoryStorage();
    corruptStorage.values.set(TASK_STORAGE_KEY, '{bad-v2');
    corruptStorage.values.set(LEGACY_TASK_STORAGE_KEY, '{bad-v1');
    const seeded = await new LocalWorkspaceRepository(
      corruptStorage,
      () => NOW,
    ).load();
    expect(seeded.kind).toBe('seeded');
    expect(seeded.snapshot.projects[0].key).toBe('FT');
  });

  it('falls through invalid V2 to valid V1 and marks a corrupt V3 seed as recovered', async () => {
    const fallbackStorage = new MemoryStorage();
    fallbackStorage.values.set(TASK_STORAGE_KEY, '{bad-v2');
    fallbackStorage.values.set(
      LEGACY_TASK_STORAGE_KEY,
      JSON.stringify(makeLegacySnapshot()),
    );
    await expect(
      new LocalWorkspaceRepository(fallbackStorage, () => NOW).load(),
    ).resolves.toMatchObject({ kind: 'migrated' });

    const recoveredStorage = new MemoryStorage();
    recoveredStorage.values.set(WORKSPACE_STORAGE_KEY, '{bad-v3');
    await expect(
      new LocalWorkspaceRepository(recoveredStorage, () => NOW).load(),
    ).resolves.toMatchObject({ kind: 'recovered' });
  });

  it('does not hide persistence failures during legacy migration', async () => {
    const v2Storage = new MemoryStorage();
    v2Storage.values.set(TASK_STORAGE_KEY, JSON.stringify(makeSnapshot()));
    v2Storage.writeError = new Error('quota');
    v2Storage.writeErrorKey = WORKSPACE_STORAGE_KEY;
    await expect(
      new LocalWorkspaceRepository(v2Storage, () => NOW).load(),
    ).rejects.toMatchObject({ operation: 'write' });

    const v1Storage = new MemoryStorage();
    v1Storage.values.set(
      LEGACY_TASK_STORAGE_KEY,
      JSON.stringify(makeLegacySnapshot()),
    );
    v1Storage.writeError = new Error('quota');
    v1Storage.writeErrorKey = WORKSPACE_STORAGE_KEY;
    await expect(
      new LocalWorkspaceRepository(v1Storage, () => NOW).load(),
    ).rejects.toMatchObject({ operation: 'write' });
  });

  it('validates writes and reports storage operations precisely', async () => {
    const invalidRepository = new LocalWorkspaceRepository(
      new MemoryStorage(),
      () => NOW,
    );
    await expect(
      invalidRepository.save({ schemaVersion: 3, projects: [{}] } as never),
    ).rejects.toMatchObject({ operation: 'validation' });

    const readStorage = new MemoryStorage();
    readStorage.readError = new Error('read unavailable');
    await expect(
      new LocalWorkspaceRepository(readStorage, () => NOW).load(),
    ).rejects.toMatchObject({ operation: 'read' });

    const writeStorage = new MemoryStorage();
    writeStorage.writeError = new Error('quota exceeded');
    await expect(
      new LocalWorkspaceRepository(writeStorage, () => NOW).save({
        schemaVersion: 3,
        projects: [],
      }),
    ).rejects.toMatchObject({ operation: 'write' });

    const recoveryStorage = new MemoryStorage();
    recoveryStorage.values.set(WORKSPACE_STORAGE_KEY, '{bad-v3');
    recoveryStorage.writeError = new Error('recovery unavailable');
    recoveryStorage.writeErrorKey = WORKSPACE_RECOVERY_STORAGE_KEY;
    await expect(
      new LocalWorkspaceRepository(recoveryStorage, () => NOW).load(),
    ).rejects.toMatchObject({ operation: 'recovery' });
  });

  it('accepts project-specific task keys while keeping references local', () => {
    const project = {
      id: 'project-game',
      key: 'GAME',
      name: 'Game',
      description: '',
      createdAt: NOW,
      updatedAt: NOW,
      nextTaskNumber: 2,
      tasks: [
        {
          ...makeSnapshot().tasks[0],
          key: 'GAME-1',
          assigneeId: 'owner-game',
          reporterId: 'owner-game',
        },
      ],
      members: [
        {
          id: 'owner-game',
          name: 'Local user',
          email: 'local@example.com',
          createdAt: NOW,
          role: 'owner' as const,
          status: 'joined' as const,
        },
      ],
      sprints: makeSnapshot().sprints,
    };

    expect(
      workspaceSnapshotV3Schema.safeParse({
        schemaVersion: 3,
        projects: [project],
      }).success,
    ).toBe(true);
    expect(
      workspaceSnapshotV3Schema.safeParse({
        schemaVersion: 3,
        projects: [
          {
            ...project,
            tasks: [
              { ...project.tasks[0], assigneeId: 'other-project-member' },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
