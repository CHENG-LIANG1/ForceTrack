import type { Member } from '@/domain/member';
import {
  type DomainDependencies,
  type Task,
  type TaskFields,
  type TaskSnapshotV2,
  type TaskSnapshotV1,
  type TaskV1,
} from '@/domain/task';

export const FIXED_NOW = '2026-08-11T08:00:00.000Z';
export const LATER_NOW = '2026-08-11T09:00:00.000Z';

export const testMembers: Member[] = [
  {
    id: 'member-1',
    name: 'Ada',
    email: 'ada@example.com',
    createdAt: FIXED_NOW,
  },
  {
    id: 'member-2',
    name: 'Lin',
    email: 'lin@example.com',
    createdAt: FIXED_NOW,
  },
];

export function makeDependencies(
  ids: readonly string[] = ['generated-id'],
  now = FIXED_NOW,
): DomainDependencies {
  let idIndex = 0;
  return {
    createId: () => ids[idIndex++] ?? `generated-id-${idIndex}`,
    now: () => now,
  };
}

export function makeTaskFields(
  overrides: Partial<TaskFields> = {},
): TaskFields {
  return {
    title: 'Test task',
    description: '',
    workType: 'task',
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
    reporterId: 'member-1',
    parentId: null,
    labels: [],
    sprintId: 'sprint-1',
    storyPoints: null,
    startDate: null,
    dueDate: null,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    key: 'FT-1',
    ...makeTaskFields(),
    position: 0,
    rank: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

export function makeSnapshot(
  overrides: Partial<TaskSnapshotV2> = {},
): TaskSnapshotV2 {
  return {
    schemaVersion: 2,
    nextTaskNumber: 3,
    tasks: [
      makeTask(),
      makeTask({ id: 'task-2', key: 'FT-2', position: 1, rank: 1 }),
    ],
    members: testMembers,
    sprints: [
      {
        id: 'sprint-1',
        name: 'ForceTrack Sprint 1',
        goal: 'Test the active sprint',
        startDate: '2026-08-08',
        endDate: '2026-08-21',
        status: 'active',
        position: 0,
        createdAt: FIXED_NOW,
        startedAt: FIXED_NOW,
        completedAt: null,
      },
    ],
    ...overrides,
  };
}

export function makeLegacyTask(overrides: Partial<TaskV1> = {}): TaskV1 {
  const task = makeTask(overrides);
  return {
    id: task.id,
    key: task.key,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    startDate: task.startDate,
    dueDate: task.dueDate,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function makeLegacySnapshot(
  overrides: Partial<TaskSnapshotV1> = {},
): TaskSnapshotV1 {
  return {
    schemaVersion: 1,
    nextTaskNumber: 3,
    tasks: [
      makeLegacyTask(),
      makeLegacyTask({ id: 'task-2', key: 'FT-2', position: 1 }),
    ],
    members: testMembers.map(({ id, name, avatar }) => ({
      id,
      name,
      ...(avatar ? { avatar } : {}),
    })),
    ...overrides,
  };
}
