import {
  taskSnapshotV1Schema,
  taskSnapshotV2Schema,
} from '@/infrastructure/storage-schema';
import { makeLegacySnapshot, makeSnapshot, makeTask } from '@/test/fixtures';

describe('versioned task snapshot schemas', () => {
  it('keeps V1 as the exact T0-T4 input format', () => {
    const legacy = makeLegacySnapshot();
    expect(taskSnapshotV1Schema.parse(legacy)).toEqual(legacy);
    expect(taskSnapshotV1Schema.safeParse(makeSnapshot()).success).toBe(false);
  });

  it('accepts a valid V2 snapshot and returns a separate value', () => {
    const snapshot = makeSnapshot();
    const parsed = taskSnapshotV2Schema.parse(snapshot);
    expect(parsed).toEqual(snapshot);
    expect(parsed).not.toBe(snapshot);
  });

  it.each([
    {
      label: 'wrong version',
      snapshot: { ...makeSnapshot(), schemaVersion: 1 },
    },
    {
      label: 'duplicate task IDs',
      snapshot: makeSnapshot({
        tasks: [makeTask(), makeTask({ key: 'FT-2', position: 1, rank: 1 })],
      }),
    },
    {
      label: 'position gap',
      snapshot: makeSnapshot({
        tasks: [
          makeTask(),
          makeTask({ id: 'task-2', key: 'FT-2', position: 2, rank: 1 }),
        ],
      }),
    },
    {
      label: 'rank gap',
      snapshot: makeSnapshot({
        tasks: [
          makeTask(),
          makeTask({ id: 'task-2', key: 'FT-2', position: 1, rank: 2 }),
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
      label: 'missing reporter',
      snapshot: makeSnapshot({
        tasks: [makeTask({ reporterId: 'unknown' })],
      }),
    },
    {
      label: 'missing sprint',
      snapshot: makeSnapshot({
        tasks: [makeTask({ sprintId: 'unknown' })],
      }),
    },
    {
      label: 'invalid parent',
      snapshot: makeSnapshot({
        tasks: [makeTask({ parentId: 'task-1' })],
      }),
    },
    {
      label: 'duplicate member email ignoring case',
      snapshot: makeSnapshot({
        members: [
          makeSnapshot().members[0],
          {
            ...makeSnapshot().members[1],
            email: 'ADA@example.com',
          },
        ],
      }),
    },
    {
      label: 'multiple active sprints',
      snapshot: makeSnapshot({
        sprints: [
          makeSnapshot().sprints[0],
          {
            ...makeSnapshot().sprints[0],
            id: 'sprint-2',
            position: 1,
          },
        ],
      }),
    },
    {
      label: 'invalid calendar date',
      snapshot: makeSnapshot({
        tasks: [makeTask({ startDate: '2026-02-30' })],
      }),
    },
    {
      label: 'stale next number',
      snapshot: makeSnapshot({ nextTaskNumber: 2 }),
    },
  ])('rejects $label', ({ snapshot }) => {
    expect(taskSnapshotV2Schema.safeParse(snapshot).success).toBe(false);
  });
});
