import {
  ACTIVE_SPRINT_ID,
  type TaskSnapshotV1,
  type TaskSnapshotV2,
} from '@/domain/task';

const FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/** Deterministically upgrades the exact T0-T4 snapshot without rewriting V1. */
export function migrateTaskSnapshotV1(
  snapshot: TaskSnapshotV1,
): TaskSnapshotV2 {
  const createdAt =
    [...snapshot.tasks].map((task) => task.createdAt).sort()[0] ??
    FALLBACK_TIMESTAMP;
  const startedOn =
    [...snapshot.tasks]
      .map((task) => task.startDate)
      .filter((value): value is string => value !== null)
      .sort()[0] ?? createdAt.slice(0, 10);
  const endsOn =
    [...snapshot.tasks]
      .map((task) => task.dueDate)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? startedOn;
  const hasTasks = snapshot.tasks.length > 0;

  return {
    schemaVersion: 2,
    nextTaskNumber: snapshot.nextTaskNumber,
    members: snapshot.members.map((member, index) => ({
      ...member,
      email: `member-${index + 1}@forcetrack.local`,
      createdAt,
    })),
    sprints: hasTasks
      ? [
          {
            id: ACTIVE_SPRINT_ID,
            name: 'ForceTrack Sprint 1',
            goal: '',
            startDate: startedOn,
            endDate: endsOn < startedOn ? startedOn : endsOn,
            status: 'active',
            position: 0,
            createdAt,
            startedAt: createdAt,
            completedAt: null,
          },
        ]
      : [],
    tasks: snapshot.tasks.map((task, rank) => ({
      ...task,
      workType: 'task',
      reporterId: null,
      parentId: null,
      labels: [],
      sprintId: hasTasks ? ACTIVE_SPRINT_ID : null,
      storyPoints: null,
      rank,
    })),
  };
}
