import type { Member } from '@/domain/member';
import {
  ACTIVE_SPRINT_ID,
  createTask,
  type DomainDependencies,
  type TaskFields,
  type TaskSnapshotV2,
} from '@/domain/task';

const SEED_MEMBER_IDENTITIES = [
  { id: 'member-lin', name: 'Lin Chen', email: 'lin@forcetrack.local' },
  { id: 'member-maya', name: 'Maya Patel', email: 'maya@forcetrack.local' },
  { id: 'member-noah', name: 'Noah Williams', email: 'noah@forcetrack.local' },
] as const;

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
): TaskSnapshotV2 {
  const baseDate = new Date(dependencies.now());
  const timestamp = dependencies.now();
  const seedMembers: Member[] = SEED_MEMBER_IDENTITIES.map((member) => ({
    ...member,
    createdAt: timestamp,
  }));
  let snapshot: TaskSnapshotV2 = {
    schemaVersion: 2,
    nextTaskNumber: 1,
    tasks: [],
    members: seedMembers,
    sprints: [
      {
        id: ACTIVE_SPRINT_ID,
        name: 'ForceTrack Sprint 1',
        goal: 'Deliver the first usable planning workflow.',
        startDate: dateOffset(baseDate, -3),
        endDate: dateOffset(baseDate, 10),
        status: 'active',
        position: 0,
        createdAt: timestamp,
        startedAt: timestamp,
        completedAt: null,
      },
    ],
  };

  const inputs: TaskFields[] = [
    {
      title: 'Define MVP acceptance criteria',
      description: 'Align the team around the release boundary.',
      workType: 'story',
      status: 'todo',
      priority: 'high',
      assigneeId: 'member-lin',
      reporterId: 'member-maya',
      parentId: null,
      labels: ['mvp', 'planning'],
      sprintId: 'sprint-1',
      storyPoints: 3,
      startDate: dateOffset(baseDate, -1),
      dueDate: dateOffset(baseDate, 1),
    },
    {
      title: 'Prepare usability test script',
      description: '',
      workType: 'task',
      status: 'todo',
      priority: 'medium',
      assigneeId: null,
      reporterId: 'member-lin',
      parentId: null,
      labels: ['research'],
      sprintId: null,
      storyPoints: 2,
      startDate: null,
      dueDate: dateOffset(baseDate, 4),
    },
    {
      title: 'Build task editor flow',
      description: 'Cover create, edit, delete, and validation states.',
      workType: 'story',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'member-maya',
      reporterId: 'member-lin',
      parentId: null,
      labels: ['frontend'],
      sprintId: 'sprint-1',
      storyPoints: 5,
      startDate: dateOffset(baseDate, -2),
      dueDate: dateOffset(baseDate, 2),
    },
    {
      title: 'Review board interactions',
      description: '',
      workType: 'bug',
      status: 'in_review',
      priority: 'medium',
      assigneeId: 'member-noah',
      reporterId: 'member-maya',
      parentId: null,
      labels: ['ux'],
      sprintId: 'sprint-1',
      storyPoints: 2,
      startDate: dateOffset(baseDate, -3),
      dueDate: dateOffset(baseDate, 0),
    },
    {
      title: 'Set up quality gates',
      description: 'Keep typecheck, unit tests, and build repeatable.',
      workType: 'task',
      status: 'done',
      priority: 'low',
      assigneeId: 'member-lin',
      reporterId: 'member-lin',
      parentId: null,
      labels: ['quality'],
      sprintId: 'sprint-1',
      storyPoints: 3,
      startDate: dateOffset(baseDate, -6),
      dueDate: dateOffset(baseDate, -4),
    },
    {
      title: 'Map timeline edge cases',
      description: '',
      workType: 'epic',
      status: 'done',
      priority: 'medium',
      assigneeId: 'member-maya',
      reporterId: 'member-noah',
      parentId: null,
      labels: ['timeline'],
      sprintId: null,
      storyPoints: null,
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

export function createBrowserSeedSnapshot(): TaskSnapshotV2 {
  return createSeedSnapshot({
    createId: () => globalThis.crypto.randomUUID(),
    now: () => new Date().toISOString(),
  });
}
