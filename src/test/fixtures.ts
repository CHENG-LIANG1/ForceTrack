import type { Member } from '@/domain/member';
import {
  type DomainDependencies,
  type Task,
  type TaskFields,
  type TaskSnapshotV1,
} from '@/domain/task';

export const FIXED_NOW = '2026-08-11T08:00:00.000Z';
export const LATER_NOW = '2026-08-11T09:00:00.000Z';

export const testMembers: Member[] = [
  { id: 'member-1', name: 'Ada' },
  { id: 'member-2', name: 'Lin' },
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
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
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
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

export function makeSnapshot(
  overrides: Partial<TaskSnapshotV1> = {},
): TaskSnapshotV1 {
  return {
    schemaVersion: 1,
    nextTaskNumber: 3,
    tasks: [makeTask(), makeTask({ id: 'task-2', key: 'FT-2', position: 1 })],
    members: testMembers,
    ...overrides,
  };
}
