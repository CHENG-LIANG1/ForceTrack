import {
  LocalTaskRepository,
  LEGACY_TASK_STORAGE_KEY,
  RECOVERY_STORAGE_KEY,
  TASK_STORAGE_KEY,
} from '@/infrastructure/local-task-repository';
import {
  RepositoryError,
  type StorageAdapter,
} from '@/infrastructure/repositories';
import { migrateTaskSnapshotV1 } from '@/infrastructure/task-migration';
import {
  makeLegacySnapshot,
  makeLegacyTask,
  makeSnapshot,
} from '@/test/fixtures';

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  readError: unknown;
  writeError: unknown;

  getItem(key: string): string | null {
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.writeError) throw this.writeError;
    this.values.set(key, value);
  }
}

describe('LocalTaskRepository', () => {
  it('seeds and persists only when the storage key is absent', async () => {
    const storage = new MemoryStorage();
    const seed = makeSnapshot();
    const repository = new LocalTaskRepository(storage, () => seed);

    await expect(repository.load()).resolves.toEqual({
      kind: 'seeded',
      snapshot: seed,
    });
    expect(JSON.parse(storage.values.get(TASK_STORAGE_KEY)!)).toEqual(seed);
  });

  it('migrates V1 once, preserves legacy raw data, and loads V2 on refresh', async () => {
    const storage = new MemoryStorage();
    const legacy = makeLegacySnapshot();
    const legacyRaw = JSON.stringify(legacy);
    storage.values.set(LEGACY_TASK_STORAGE_KEY, legacyRaw);
    const repository = new LocalTaskRepository(storage);

    const first = await repository.load();
    expect(first.kind).toBe('migrated');
    expect(first.snapshot.schemaVersion).toBe(2);
    expect(first.snapshot.tasks.map((task) => task.id)).toEqual(
      legacy.tasks.map((task) => task.id),
    );
    expect(first.snapshot.tasks.map((task) => task.key)).toEqual(
      legacy.tasks.map((task) => task.key),
    );
    expect(first.snapshot.tasks.map((task) => task.position)).toEqual(
      legacy.tasks.map((task) => task.position),
    );
    expect(storage.values.get(LEGACY_TASK_STORAGE_KEY)).toBe(legacyRaw);

    const second = await repository.load();
    expect(second.kind).toBe('loaded');
    expect(second.snapshot).toEqual(first.snapshot);
  });

  it('migrates a valid empty V1 snapshot instead of reseeding it', async () => {
    const storage = new MemoryStorage();
    const legacy = makeLegacySnapshot({ tasks: [], nextTaskNumber: 3 });
    storage.values.set(LEGACY_TASK_STORAGE_KEY, JSON.stringify(legacy));
    const seedFactory = vi.fn(() => makeSnapshot());

    const result = await new LocalTaskRepository(storage, seedFactory).load();
    expect(result.kind).toBe('migrated');
    expect(result.snapshot.tasks).toEqual([]);
    expect(result.snapshot.sprints).toEqual([]);
    expect(seedFactory).not.toHaveBeenCalled();
  });

  it('clamps a migrated Sprint range when legacy due dates precede start dates', () => {
    const legacy = makeLegacySnapshot({
      tasks: [
        makeLegacyTask({
          startDate: '2026-08-20',
          dueDate: '2026-08-19',
        }),
      ],
      nextTaskNumber: 2,
    });

    expect(migrateTaskSnapshotV1(legacy).sprints[0]).toMatchObject({
      startDate: '2026-08-20',
      endDate: '2026-08-20',
    });
  });

  it('backs up corrupt V1 and recovers when no V2 exists', async () => {
    const storage = new MemoryStorage();
    const seed = makeSnapshot({ tasks: [], nextTaskNumber: 1 });
    storage.values.set(LEGACY_TASK_STORAGE_KEY, '{broken-v1');

    await expect(
      new LocalTaskRepository(storage, () => seed).load(),
    ).resolves.toEqual({ kind: 'recovered', snapshot: seed });
    expect(storage.values.get(RECOVERY_STORAGE_KEY)).toBe('{broken-v1');
  });

  it('loads a valid empty task list instead of reseeding it', async () => {
    const storage = new MemoryStorage();
    const emptySnapshot = makeSnapshot({ tasks: [], nextTaskNumber: 3 });
    storage.values.set(TASK_STORAGE_KEY, JSON.stringify(emptySnapshot));
    const seedFactory = vi.fn(() => makeSnapshot());

    await expect(
      new LocalTaskRepository(storage, seedFactory).load(),
    ).resolves.toEqual({ kind: 'loaded', snapshot: emptySnapshot });
    expect(seedFactory).not.toHaveBeenCalled();
  });

  it.each([
    ['damaged JSON', '{not-json'],
    ['wrong schema', JSON.stringify({ schemaVersion: 99, tasks: [] })],
  ])('backs up and recovers %s with a valid seed', async (_, invalidRaw) => {
    const storage = new MemoryStorage();
    const seed = makeSnapshot();
    storage.values.set(TASK_STORAGE_KEY, invalidRaw);

    await expect(
      new LocalTaskRepository(storage, () => seed).load(),
    ).resolves.toEqual({ kind: 'recovered', snapshot: seed });
    expect(storage.values.get(RECOVERY_STORAGE_KEY)).toBe(invalidRaw);
    expect(JSON.parse(storage.values.get(TASK_STORAGE_KEY)!)).toEqual(seed);
  });

  it('does not fall back to V1 when an existing V2 snapshot is corrupt', async () => {
    const storage = new MemoryStorage();
    const seed = makeSnapshot({ tasks: [], nextTaskNumber: 1 });
    storage.values.set(TASK_STORAGE_KEY, '{broken-v2');
    storage.values.set(
      LEGACY_TASK_STORAGE_KEY,
      JSON.stringify(makeLegacySnapshot()),
    );

    const result = await new LocalTaskRepository(storage, () => seed).load();
    expect(result).toEqual({ kind: 'recovered', snapshot: seed });
    expect(storage.values.get(RECOVERY_STORAGE_KEY)).toBe('{broken-v2');
  });

  it('reports unavailable reads as an explicit repository error', async () => {
    const storage = new MemoryStorage();
    storage.readError = new DOMException('blocked', 'SecurityError');

    await expect(new LocalTaskRepository(storage).load()).rejects.toMatchObject(
      {
        name: 'RepositoryError',
        operation: 'read',
      },
    );
  });

  it('reports quota/save failure without mutating the supplied snapshot', async () => {
    const storage = new MemoryStorage();
    storage.writeError = new DOMException('full', 'QuotaExceededError');
    const snapshot = makeSnapshot();
    const before = structuredClone(snapshot);

    await expect(
      new LocalTaskRepository(storage).save(snapshot),
    ).rejects.toMatchObject({
      name: 'RepositoryError',
      operation: 'write',
    });
    expect(snapshot).toEqual(before);
  });

  it('reports a recovery error when corrupt data cannot be backed up', async () => {
    const storage = new MemoryStorage();
    storage.values.set(TASK_STORAGE_KEY, '{broken-v2');
    storage.writeError = new DOMException('blocked', 'SecurityError');

    await expect(new LocalTaskRepository(storage).load()).rejects.toMatchObject(
      {
        name: 'RepositoryError',
        operation: 'recovery',
      },
    );
  });

  it('preserves an explicit write error raised while persisting a V1 migration', async () => {
    const storage = new MemoryStorage();
    storage.values.set(
      LEGACY_TASK_STORAGE_KEY,
      JSON.stringify(makeLegacySnapshot()),
    );
    storage.writeError = new DOMException('full', 'QuotaExceededError');

    await expect(new LocalTaskRepository(storage).load()).rejects.toMatchObject(
      {
        name: 'RepositoryError',
        operation: 'write',
      },
    );
  });

  it('rejects invalid snapshots before writing them', async () => {
    const storage = new MemoryStorage();
    const invalidSnapshot = makeSnapshot({ nextTaskNumber: 1 });

    await expect(
      new LocalTaskRepository(storage).save(invalidSnapshot),
    ).rejects.toEqual(expect.any(RepositoryError));
    await expect(
      new LocalTaskRepository(storage).save(invalidSnapshot),
    ).rejects.toMatchObject({ operation: 'validation' });
    expect(storage.values.has(TASK_STORAGE_KEY)).toBe(false);
  });
});
