import { createSeedSnapshot } from '@/infrastructure/seed-data';
import { taskSnapshotV1Schema } from '@/infrastructure/storage-schema';
import { makeDependencies } from '@/test/fixtures';

describe('createSeedSnapshot', () => {
  it('creates six varied, valid tasks with deterministic dependencies', () => {
    const snapshot = createSeedSnapshot(
      makeDependencies([
        'seed-1',
        'seed-2',
        'seed-3',
        'seed-4',
        'seed-5',
        'seed-6',
      ]),
    );

    expect(taskSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    expect(snapshot.tasks).toHaveLength(6);
    expect(snapshot.nextTaskNumber).toBe(7);
    expect(new Set(snapshot.tasks.map((task) => task.id)).size).toBe(6);
    expect(new Set(snapshot.tasks.map((task) => task.status)).size).toBe(4);
    expect(new Set(snapshot.tasks.map((task) => task.priority)).size).toBe(3);
    expect(snapshot.tasks.some((task) => task.assigneeId === null)).toBe(true);
    expect(snapshot.tasks.some((task) => task.dueDate === null)).toBe(true);
  });
});
