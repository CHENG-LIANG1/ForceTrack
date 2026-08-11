import type { Member } from '@/domain/member';
import {
  createTask,
  type DomainDependencies,
  type TaskFields,
  type TaskSnapshotV1,
} from '@/domain/task';

export const SEED_MEMBERS: readonly Member[] = [
  { id: 'member-lin', name: 'Lin Chen' },
  { id: 'member-maya', name: 'Maya Patel' },
  { id: 'member-noah', name: 'Noah Williams' },
];

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOffset(base: Date, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function createSeedSnapshot(
  dependencies: DomainDependencies,
): TaskSnapshotV1 {
  const baseDate = new Date(dependencies.now());
  let snapshot: TaskSnapshotV1 = {
    schemaVersion: 1,
    nextTaskNumber: 1,
    tasks: [],
    members: SEED_MEMBERS.map((member) => ({ ...member })),
  };

  const inputs: TaskFields[] = [
    {
      title: 'Define MVP acceptance criteria',
      description: 'Align the team around the release boundary.',
      status: 'todo',
      priority: 'high',
      assigneeId: 'member-lin',
      startDate: dateOffset(baseDate, -1),
      dueDate: dateOffset(baseDate, 1),
    },
    {
      title: 'Prepare usability test script',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigneeId: null,
      startDate: null,
      dueDate: dateOffset(baseDate, 4),
    },
    {
      title: 'Build task editor flow',
      description: 'Cover create, edit, delete, and validation states.',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'member-maya',
      startDate: dateOffset(baseDate, -2),
      dueDate: dateOffset(baseDate, 2),
    },
    {
      title: 'Review board interactions',
      description: '',
      status: 'in_review',
      priority: 'medium',
      assigneeId: 'member-noah',
      startDate: dateOffset(baseDate, -3),
      dueDate: dateOffset(baseDate, 0),
    },
    {
      title: 'Set up quality gates',
      description: 'Keep typecheck, unit tests, and build repeatable.',
      status: 'done',
      priority: 'low',
      assigneeId: 'member-lin',
      startDate: dateOffset(baseDate, -6),
      dueDate: dateOffset(baseDate, -4),
    },
    {
      title: 'Map timeline edge cases',
      description: '',
      status: 'done',
      priority: 'medium',
      assigneeId: 'member-maya',
      startDate: null,
      dueDate: null,
    },
  ];

  for (const input of inputs) {
    const task = createTask(snapshot, input, dependencies);
    snapshot = {
      ...snapshot,
      nextTaskNumber: snapshot.nextTaskNumber + 1,
      tasks: [...snapshot.tasks, task],
    };
  }

  return snapshot;
}

export function createBrowserSeedSnapshot(): TaskSnapshotV1 {
  return createSeedSnapshot({
    createId: () => globalThis.crypto.randomUUID(),
    now: () => new Date().toISOString(),
  });
}
