import { taskSnapshotV1Schema } from '@/infrastructure/storage-schema';
import { makeSnapshot, makeTask } from '@/test/fixtures';

describe('taskSnapshotV1Schema', () => {
  it('accepts a valid versioned snapshot and returns a separate value', () => {
    const snapshot = makeSnapshot();
    const parsed = taskSnapshotV1Schema.parse(snapshot);

    expect(parsed).toEqual(snapshot);
    expect(parsed).not.toBe(snapshot);
  });

  it.each([
    {
      label: 'wrong version',
      snapshot: { ...makeSnapshot(), schemaVersion: 2 },
    },
    {
      label: 'duplicate IDs',
      snapshot: makeSnapshot({
        tasks: [makeTask(), makeTask({ key: 'FT-2', position: 1 })],
      }),
    },
    {
      label: 'position gap',
      snapshot: makeSnapshot({
        tasks: [
          makeTask(),
          makeTask({ id: 'task-2', key: 'FT-2', position: 2 }),
        ],
      }),
    },
    {
      label: 'missing assignee',
      snapshot: makeSnapshot({
        tasks: [makeTask({ assigneeId: 'unknown' })],
      }),
    },
    {
      label: 'invalid calendar date',
      snapshot: makeSnapshot({
        tasks: [makeTask({ startDate: '2026-02-30' })],
      }),
    },
    {
      label: 'reverse date range',
      snapshot: makeSnapshot({
        tasks: [makeTask({ startDate: '2026-08-12', dueDate: '2026-08-11' })],
      }),
    },
    {
      label: 'stale next number',
      snapshot: makeSnapshot({ nextTaskNumber: 2 }),
    },
  ])('rejects $label', ({ snapshot }) => {
    expect(taskSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
  });
});
